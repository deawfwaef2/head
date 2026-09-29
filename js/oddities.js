// 第十五轮（协作 Agent）：恶趣味陈列馆 —— 7 座「把首级放进日常生活」的新建筑（MOD：oddities，默认开）
// 设计依据（玩家为什么爽）：
//   ① 收集/策展：摆放组合有最优解（肖像廊评分、猎首墙谱系） ② 反差幽默：首级在最日常的场景里（茶会、摇椅、沙发看电视、菜园）
//   ③ 等待→爆发：攒得越久越爽（摇椅安睡值、电视追剧值、菜园成熟） ④ 抽卡悬念：鉴定台品相只升不降+保底
//   ⑤ 可见的成长：画框随魂阶自动升格、猎人称号晋升、菜苗长高开花 ⑥ 连锁反馈：逐个啜茶/逐个开花/逐个颤抖的节奏感
// 全部外观用 Poly Haven CC0 模型（assets/*.js），只用程序做摆放/动画/屏幕画面；首级文本遵守第八轮「首级不说话，只有低频回忆气泡」。
// 只通过 BuildCat.C / Unlocks.R / G.HOOK 挂载，不改 builds.js / game.js / sanctum.js。
window.Oddities = (() => {
  if (window.Mods && Mods.on && !Mods.on('oddities')) return { off: true };
  const BC = window.BuildCat, A = window.Assets;
  if (!BC || !A) return {};
  const C = BC.C, V3 = THREE.Vector3, HS = 1.55;
  const F = (n, o) => (A.has(n) ? A.fit(n, o) : null);
  const add = (g, o) => { if (o) g.add(o); return o; };
  const fl = (g, x, y, z, s, c) => add(g, A.flame ? A.flame(x, y, z, s, c) : BC.flame(x, y, z, s, c));
  const fmt = n => (window.G && G.fmtN) ? G.fmtN(n) : String(Math.round(n));
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const RARN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'], RARC = ['#b8b8c0', '#4aa8ff', '#c05aff', '#ffb020', '#ff4a8a'];
  const later = (ms, f) => setTimeout(() => { try { f(); } catch (e) { console.warn('oddities', e); } }, ms);
  const alive = h => h && window.G && G.heads.includes(h);
  const ODD = () => { const S = G.S; return S.odd || (S.odd = { galBest: 0, fame: 0, appr: 0, pity: 0, garden: 0, tv: 0 }); };

  // ---------- 工具：射线求模型表面高度（用来把插槽对准真实座面 / 台面） ----------
  const _rc = new THREE.Raycaster();
  function topAt(obj, x, z, fallback) {
    obj.updateMatrixWorld(true);
    _rc.set(new V3(x, 4, z), new V3(0, -1, 0)); _rc.far = 8;
    const hit = _rc.intersectObject(obj, true).find(i => i.object.isMesh);
    return hit ? hit.point.y : fallback;
  }
  // 首级切口中心对准 pos（与 game.js seatHead 同一公式）
  const _so = new V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
  function seatAt(h, pos, quat) {
    h.g.quaternion.copy(quat);
    const m = h.hb.meta || {}, cut = m.cut || { x: 0, y: m.bottom != null ? m.bottom : -0.1, z: 0 };
    _so.set((cut.x || 0) * HS, (cut.y != null ? cut.y : -0.1) * HS - 0.005, (cut.z || 0) * HS).applyQuaternion(quat);
    h.g.position.copy(pos).sub(_so);
  }
  // 插槽 → 世界坐标（与 game.js mountPos 相同的旋转约定）
  function slotWorld(b, s, dy = 0) {
    const a = -b.rot * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a);
    return new V3(b.x + s[0] * c + s[2] * sn, s[1] - 0.02 + dy, b.z - s[0] * sn + s[2] * c);
  }
  // 以插槽朝向为基准，叠加本地俯仰/侧倾/偏航
  function slotQuat(b, s, rx = 0, rz = 0, ry = 0) { _e.set(rx, -b.rot * Math.PI / 2 + (s[3] != null ? s[3] : Math.PI) + ry, rz, 'YXZ'); return _q.setFromEuler(_e).clone(); }
  function reseat(b, i, o = {}) {
    const h = b.heads && b.heads[i]; if (!h || h === G.held) return;
    const s = C[b.type].mount.slots[i];
    seatAt(h, slotWorld(b, s, o.dy || 0).add(o.off || new V3()), slotQuat(b, s, o.rx || 0, o.rz || 0, o.ry || 0));
  }
  const heads = b => (b.heads || []).filter(Boolean);
  function cool(b, key, sec, label) {
    const now = G.clock.elapsedTime; b._cd = b._cd || {};
    if (b._cd[key] && now < b._cd[key]) { G.toast(`${label}（${Math.ceil(b._cd[key] - now)} 秒）`, '#bbb', 1.4); return false; }
    b._cd[key] = now + sec; return true;
  }
  const ft = (h, t, c, s) => G.floatText(t, h.g.position.clone().add(new V3(0, 0.38, 0)), c, s || 16);
  // 低频回忆气泡（第八轮：首级不说话，只偶尔浮现回忆）
  const MEM = [
    c => `（……${c.locN || '故乡'}的午后，也有这样的香气……）`,
    c => `（……好像有人答应过，要等她回去……）`,
    c => `（……${c.locN || '那里'}的钟声，现在还会响吗……）`,
    c => `（……曾经有一条总跟着她的小狗……）`,
    c => `（……那年的雪，下得特别早……）`
  ];
  function memory(h, p = 0.1) { if (Math.random() < p) ft(h, MEM[Math.floor(Math.random() * MEM.length)](h.rec.c), '#cfc6ff', 13); }

  // =====================================================================
  // 1) 亡者茶会：圆桌 + 四把餐椅 + 整套瓷茶具；首级坐在椅子上，脸刚好探出桌沿
  // =====================================================================
  const TEA_R = 0.66;
  const teaSlots = [0, 1, 2, 3].map(k => { const a = k * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * TEA_R, z = Math.sin(a) * TEA_R; return [x, 0.55, z, Math.atan2(-x, -z)]; });
  C.tea_party = {
    cat: 'func', n: '亡者茶会', icon: '🫖', base: 900, grow: 1.6, fp: [1.0, 1.0],
    stat: { soul: 3, con: 1 }, depth: 1,
    desc: '一张小圆桌、四把餐椅、一整套瓷茶具。首级们端坐椅上，脸刚好探出桌沿，像在等你斟茶。每 13 秒 ×1.7 产出。空手按 E【斟茶】：茶壶依次为每位倒茶，首级逐个低头「啜饮」——种族越杂越热闹（百族茶会），魂阶最高者坐主宾位 ×1.5；冷却结束后 8 秒内再斟 = 续杯连击（最高 ×2）。',
    mount: { y: 0.55, period: 13, mult: 1.7, labelY: 1.05, slots: teaSlots },
    make() {
      const g = new THREE.Group(), d = C.tea_party;
      const tb = add(g, F('round_wooden_table_02', { w: 0.82 }));
      const top = tb ? tb.userData.size.y : 0.75;
      const ts = add(g, F('tea_set_01', { w: 0.42, y: top }));
      if (ts) { ts.traverse(o => { if (/teapot/.test(o.name) && o.isMesh && !g.userData.pot) g.userData.pot = o; }); }
      for (let k = 0; k < 4; k++) {
        const s = teaSlots[k], r = TEA_R + 0.06, a = k * Math.PI / 2 + Math.PI / 4;
        add(g, F('dining_chair_02', { h: 1.02, x: Math.cos(a) * r, z: Math.sin(a) * r, ry: 0 }));
        const ch = g.children[g.children.length - 1]; if (ch) ch.rotation.y = s[3];
      }
      if (!d._cal) { d._cal = 1; for (const s of d.mount.slots) s[1] = Math.max(0.35, topAt(g, s[0] * 0.96, s[2] * 0.96, 0.5)) + 0.01; }
      fl(g, 0.12, top + 0.02, -0.12, 0.35, '#ffd08a');
      return g;
    },
    cols: () => [[-0.45, 0, -0.45, 0.45, 0.78, 0.45]]
  };

  function teaPour(b) {
    const hs = heads(b); if (!hs.length) return false;
    const now = G.clock.elapsedTime; b._cd = b._cd || {};
    const ready = !b._cd.tea || now >= b._cd.tea;
    if (!ready) { G.toast(`🫖 茶还在煮（${Math.ceil(b._cd.tea - now)} 秒）`, '#bbb', 1.4); return true; }
    b._streak = (b._cd.tea && now - b._cd.tea < 8) ? Math.min(5, (b._streak || 0) + 1) : 0;
    b._cd.tea = now + 12;
    const races = new Set(hs.map(h => h.rec.c.race)).size;
    const host = hs.reduce((m, h) => (h.rec.c.rar > m.rec.c.rar ? h : m), hs[0]);
    const mix = 1 + (races - 1) * 0.3, streak = 1 + b._streak * 0.2;
    let sum = 0; b._pour = now;
    b.heads.forEach((h, i) => {
      if (!h) return;
      later(260 + i * 420, () => {
        if (!alive(h) || h.mount !== b) return;
        b._sip = b._sip || []; b._sip[i] = G.clock.elapsedTime;
        const m = 1.6 * mix * streak * (h === host ? 1.5 : 1);
        sum += G.trigger(h, 'manual', m);
        SFX.play('plate', 0.45, 0.9 + i * 0.12);
        ft(h, h === host ? '☕ 主宾' : '☕', h === host ? '#ffd87a' : '#f3e0c0', 15);
        G.burst(h.g.position.clone().add(new V3(0, 0.05, 0)), '#e8c89a', 8, 0.5, 0.6, 1.5);
        memory(h, 0.08);
      });
    });
    later(260 + 4 * 420, () => {
      const tags = []; if (races > 1) tags.push(`百族茶会 ×${mix.toFixed(1)}`); if (b._streak) tags.push(`续杯 ${b._streak} 连 ×${streak.toFixed(1)}`);
      G.toast(`🫖 <b>斟茶</b>：${hs.length} 位宾客各饮一杯${tags.length ? ' · ' + tags.join(' · ') : ''} · +${fmt(sum)} 魂晶`, '#ffe0b0', 3);
      if (hs.length === 4 && races === 4) SFX.fanfare(2);
    });
    return true;
  }

  // =====================================================================
  // 2) 名媛肖像廊：矮条案上三幅画框，首级立在画框前——画框随魂阶自动升格
  // =====================================================================
  const FRAME = ['hanging_picture_frame_02', 'hanging_picture_frame_01', 'hanging_picture_frame_03', 'fancy_picture_frame_01', 'fancy_picture_frame_02'];
  const FRAME_N = ['旧木框', '胡桃木框', '玻璃镶框', '鎏金雕花框', '皇家巴洛克金框'];
  const GAL_X = [-0.56, 0, 0.56];
  C.portrait_gallery = {
    cat: 'func', n: '名媛肖像廊', icon: '🖼️', base: 1300, grow: 1.6, fp: [0.9, 0.3],
    stat: { soul: 3, ter: 2 }, depth: 1, showcase: true,
    desc: '一张长条案，三幅画框。把首级立在画框前，她就成了「画中人」——画框按首级魂阶自动升格：凡魂=旧木框 → 神魂=皇家巴洛克金框（异色再升一档）。每 14 秒 ×1.8 产出。空手按 E【鉴赏会】：地精斯尼克按魂阶、种族多样、左右对称、C 位压轴给整廊打分（满分 100），分数越高奖励越多，刷新最高分另有 ×2！',
    mount: { y: 0.7, period: 14, mult: 1.8, labelY: 1.35, slots: GAL_X.map(x => [x, 0.7, 0.07, 0]) },
    make() {
      const g = new THREE.Group(), d = C.portrait_gallery;
      const t = add(g, F('chinese_console_table', { w: 1.7 }));
      const top = t ? t.userData.size.y : 0.66;
      if (!d._cal) { d._cal = 1; for (const s of d.mount.slots) s[1] = topAt(g, s[0], s[2], top) + 0.005; }
      g.userData.frames = [null, null, null]; g.userData.ftier = [-2, -2, -2]; g.userData.top = top;
      for (let i = 0; i < 3; i++) setFrame(g, i, -1);
      return g;
    },
    cols: () => [[-0.86, 0, -0.18, 0.86, 0.7, 0.18]]
  };
  function tierOf(h) { const c = h.rec.c; return Math.min(4, c.rar + (c.shiny ? 1 : 0)); }
  function setFrame(g, i, tier) {
    const U = g.userData; if (U.ftier[i] === tier) return false;
    if (U.frames[i]) { g.remove(U.frames[i]); U.frames[i] = null; }
    const name = FRAME[Math.max(0, tier)];
    const w = tier >= 3 ? 0.5 : 0.46;
    const f = F(name, { w, ry: /^hanging_picture_frame_0[12]$/.test(name) ? Math.PI : 0 });
    if (f) {
      f.position.set(GAL_X[i], U.top - 0.01, -0.1); f.rotation.x = -0.1;
      // 画框原点在中心：抬高半个框高，底边落在台面
      f.position.y += (f.userData.size.y) / 2;
      f.traverse(o => {
        if (!o.isMesh) return;
        if (/canvas|glass/.test(o.name)) { o.material = o.material.clone(); o.material.map = null; o.material.color.set(tier >= 3 ? '#3a0c16' : '#1c1418'); o.material.roughness = 0.95; o.material.metalness = 0; o.material.transparent = false; o.material.opacity = 1; }
        if (tier < 0) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.55); }
      });
      if (tier === 4) { const glint = A.flame ? A.flame(0, f.userData.size.y / 2 + 0.02, 0.02, 0.25, '#ffe08a') : null; if (glint) f.add(glint); }
      g.add(f);
    }
    U.frames[i] = f; U.ftier[i] = tier; return true;
  }
  function galScore(b) {
    const hs = b.heads, on = heads(b); if (!on.length) return null;
    const lines = []; let sc = 0;
    const rarPts = on.reduce((s, h) => s + (tierOf(h) + 1) * 3, 0); sc += rarPts; lines.push(`魂阶 +${rarPts}`);
    const rc = new Set(on.map(h => h.rec.c.race)).size, ic = new Set(on.map(h => h.rec.c.id)).size;
    const div = (rc - 1) * 6 + (ic - 1) * 5; if (div) { sc += div; lines.push(`多样 +${div}`); }
    if (hs[0] && hs[2] && hs[0].rec.c.race === hs[2].rec.c.race) { sc += 12; lines.push('左右对称 +12'); }
    if (hs[1] && on.every(h => h === hs[1] || h.rec.c.rar <= hs[1].rec.c.rar) && on.length === 3) { sc += 12; lines.push('C 位压轴 +12'); }
    if (on.length === 3) { sc += 10; lines.push('满廊 +10'); }
    const sh = on.filter(h => h.rec.c.shiny).length; if (sh) { sc += sh * 6; lines.push(`异色 +${sh * 6}`); }
    const ap = on.filter(h => h.rec.appr && h.rec.appr.m >= 1.7).length; if (ap) { sc += ap * 4; lines.push(`珍品品相 +${ap * 4}`); }
    sc = Math.min(100, sc);
    const grade = sc >= 90 ? 'S' : sc >= 75 ? 'A' : sc >= 55 ? 'B' : sc >= 35 ? 'C' : 'D';
    return { sc, grade, lines };
  }
  const CRITIC = {
    S: ['斯尼克摘下帽子，沉默了整整三秒：「……这该挂进王城美术馆。」', '斯尼克哭了：「我这辈子没见过这么和谐的构图！」'],
    A: ['斯尼克连连点头：「有品位，有品位！就是左边那位的角度再侧一点……」', '「啧啧，这一廊能卖好价钱。」斯尼克搓着手。'],
    B: ['斯尼克眯着眼：「还行吧，中规中矩，缺点压轴的。」', '「挺好，就是有点像乡下肖像铺。」'],
    C: ['斯尼克打了个哈欠：「你管这叫收藏？」', '「画框比画中人值钱。」斯尼克小声说。'],
    D: ['斯尼克：「……要不先摆满再叫我？」', '斯尼克转身就走：「浪费我的时间。」']
  };
  function galCritic(b) {
    const r = galScore(b); if (!r) return false;
    if (!cool(b, 'gal', 22, '🖼️ 斯尼克还在回味上一次鉴赏')) return true;
    const O = ODD(), rec = r.sc > (O.galBest || 0);
    const mul = (1 + r.sc / 22) * (rec ? 2 : 1); let sum = 0;
    heads(b).forEach((h, i) => later(i * 180, () => { if (alive(h)) { sum += G.trigger(h, 'manual', mul); ft(h, '✦', RARC[tierOf(h)], 18); } }));
    const say = CRITIC[r.grade][Math.floor(Math.random() * CRITIC[r.grade].length)];
    later(650, () => {
      G.toast(`🖼️ <b>鉴赏会 · ${r.grade} 级 ${r.sc} 分</b>${rec ? ' <b style="color:#ffd84a">新纪录！</b>' : `（最高 ${O.galBest}）`}<br><small>${r.lines.join(' · ')}</small><br>${esc(say)} · +${fmt(sum)} 魂晶`, r.grade === 'S' ? '#ffd84a' : '#ffe6c0', 4.5);
      if (rec) { O.galBest = r.sc; SFX.fanfare(r.grade === 'S' ? 4 : 2); G.flash('#ffd84a'); } else SFX.page();
    });
    return true;
  }

  // =====================================================================
  // 3) 奶奶的摇椅：摇椅 + 靠垫 + 煤油灯。首级窝在靠垫上轻轻摇，越久越安详
  // =====================================================================
  C.rocker = {
    cat: 'func', n: '奶奶的摇椅', icon: '🪑', base: 650, grow: 1.7, fp: [0.7, 0.55],
    stat: { con: 3 }, depth: 1, light: '#ffb060',
    desc: '一把老摇椅、一只旧靠垫、一盏煤油灯。首级窝在靠垫上缓缓摇晃，<b>安睡值</b>随时间上涨（约 150 秒满）：自动产出 ×1.4 起、随安睡值最高 ×5。空手按 E【推一把】：摇椅猛晃，一次性结算 ×(2 + 安睡值×10)——安睡值归零。左键戳她会吵醒她（-30%）。等得越久越爽。',
    mount: { y: 0.6, period: 12, mult: 1.4, labelY: 1.25, slots: [[0, 0.6, 0.02, 0]] },
    make() {
      const g = new THREE.Group(), d = C.rocker;
      const rig = new THREE.Group(); g.add(rig); g.userData.rig = rig;
      const ch = add(rig, F('Rockingchair_01', { h: 1.05, z: -0.05 }));
      const pil = A.has('throw_pillows_01') ? F('throw_pillows_01', { node: 'throw_pillows_01_pillow01', w: 0.34 }) : null;
      if (!d._cal) { d._cal = 1; d._seat = topAt(rig, 0, 0.02, 0.5); }
      if (pil) { pil.position.set(0, d._seat - 0.03, 0.0); pil.rotation.x = -0.25; rig.add(pil); }
      d.mount.slots[0][1] = d._seat + 0.09;
      const lamp = add(g, F('vintage_oil_lamp', { h: 0.42, x: 0.52, z: 0.12 }));
      if (lamp) fl(g, 0.52, 0.27, 0.12, 0.35, '#ffc070');
      return g;
    },
    cols: () => [[-0.36, 0, -0.42, 0.36, 1.05, 0.45]]
  };

  // =====================================================================
  // 4) 猎首纪念台：长桌上立着牛头、狮头、马头铜像，中间留四个首级位
  // =====================================================================
  const TROPHY_X = [-0.4, -0.13, 0.13, 0.4];
  const FAME = [[0, '见习猎手'], [8, '名猎'], [25, '猎首大师'], [60, '传奇猎首者'], [140, '万首之王']];
  C.trophy_lodge = {
    cat: 'func', n: '猎首纪念台', icon: '🦁', base: 1800, grow: 1.6, fp: [0.85, 0.35],
    stat: { ter: 4, str: 1 }, depth: 2,
    desc: '猎人小屋式的纪念长桌：牛头、雄狮、骏马三尊铜像护着中间四个首级位。每 15 秒 ×2.0 产出。空手按 E【炫耀战绩】：来自不同地区 = 环游猎人（每区 +35%）；同一地区 ≥3 = 猎区专精 ×2.5；摆着地区霸主首级 = 霸主首座 ×3。每次炫耀积累「猎名」，晋升称号：见习猎手 → 名猎 → 猎首大师 → 传奇猎首者 → 万首之王（每级永久 +15% 本台产出）。',
    mount: { y: 0.95, period: 15, mult: 2.0, labelY: 1.6, slots: TROPHY_X.map(x => [x, 0.95, 0.08, 0]) },
    make() {
      const g = new THREE.Group(), d = C.trophy_lodge;
      const t = add(g, F('ClassicConsole_01', { w: 1.6 }));
      const top = t ? t.userData.size.y : 0.95;
      if (!d._cal) { d._cal = 1; for (const s of d.mount.slots) s[1] = topAt(g, s[0], s[2], top) + 0.005; }
      const y = d.mount.slots[0][1];
      add(g, F('bull_head', { h: 0.36, x: -0.66, y, z: -0.02 }));
      add(g, F('horse_head', { h: 0.36, x: 0.66, y, z: -0.04 }));
      add(g, F('lion_head', { h: 0.42, x: 0, y, z: -0.2 }));
      fl(g, -0.76, y + 0.02, 0.14, 0.4, '#ffb050'); fl(g, 0.76, y + 0.02, 0.14, 0.4, '#ffb050');
      return g;
    },
    cols: () => [[-0.8, 0, -0.3, 0.8, 0.98, 0.25]]
  };
  const fameLv = f => { let k = 0; FAME.forEach((x, i) => { if (f >= x[0]) k = i; }); return k; };
  function boast(b) {
    const hs = heads(b); if (!hs.length) return false;
    if (!cool(b, 'boast', 20, '🦁 刚炫耀过，观众还没散')) return true;
    const locs = {}; hs.forEach(h => { const k = h.rec.c.loc || '?'; locs[k] = (locs[k] || 0) + 1; });
    const nLoc = Object.keys(locs).length, maxSame = Math.max(...Object.values(locs));
    const boss = hs.filter(h => h.rec.c.boss).length;
    const tags = []; let mul = 1.5;
    if (nLoc > 1) { mul *= 1 + nLoc * 0.35; tags.push(`环游猎人 ${nLoc} 区`); }
    if (maxSame >= 3) { mul *= 2.5; tags.push('猎区专精 ×2.5'); }
    if (boss) { mul *= 3; tags.push('霸主首座 ×3'); }
    const O = ODD(), before = fameLv(O.fame || 0);
    mul *= 1 + before * 0.15;
    O.fame = (O.fame || 0) + nLoc + boss * 3;
    const after = fameLv(O.fame);
    SFX.roar && SFX.roar();
    let sum = 0;
    hs.forEach((h, i) => later(120 + i * 160, () => { if (alive(h)) { sum += G.trigger(h, 'manual', mul); ft(h, h.rec.c.locN || '？', '#ffcf8a', 14); } }));
    later(900, () => {
      G.toast(`🦁 <b>炫耀战绩</b>：${tags.join(' · ') || '先摆几颗再说'} · 猎名 ${O.fame}（${FAME[after][1]}） · +${fmt(sum)} 魂晶`, '#ffcf8a', 3.4);
      if (after > before) { later(700, () => { G.toast(`👑 称号晋升：<b>${FAME[after][1]}</b>！纪念台产出永久 +${after * 15}%`, '#ffd84a', 4); SFX.fanfare(3); G.flash('#ffd84a'); }); }
    });
    return true;
  }

  // =====================================================================
  // 5) 首级鉴定台：木桌 + 老显微镜 + 放大镜。花魂晶鉴定品相（只升不降，10 次保底）
  // =====================================================================
  const APPR = [
    { n: '寻常品相', m: 1.0, w: 45, c: '#c8c8c8' }, { n: '良品', m: 1.15, w: 25, c: '#8ad88a' }, { n: '上品', m: 1.35, w: 15, c: '#6ab0ff' },
    { n: '珍品', m: 1.7, w: 9, c: '#c07aff' }, { n: '绝品', m: 2.2, w: 4.5, c: '#ffb020' }, { n: '传说品相', m: 3.0, w: 1.5, c: '#ff4a8a' }
  ];
  const WHY = ['切口平整如镜', '睫毛根根分明', '瞳中残存星光', '发梢还留着花香', '眉心一点朱砂', '唇色仍未褪去', '耳垂小巧匀称', '发丝没有一根分叉', '面相少见的安详', '颧骨线条堪称范本'];
  C.appraisal = {
    cat: 'func', n: '首级鉴定台', icon: '🔬', base: 2400, grow: 1.9, fp: [0.5, 0.5], max: 2,
    stat: { soul: 4 }, depth: 2,
    desc: '一张小圆桌、一台黄铜显微镜、一把放大镜。放上首级，空手按 E 花魂晶【鉴定品相】：寻常 ×1.0 / 良品 ×1.15 / 上品 ×1.35 / 珍品 ×1.7 / 绝品 ×2.2 / 传说 ×3.0，永久作用于这颗首级的全部产出。<b>只升不降</b>；连续 10 次未出珍品必出珍品以上。费用随首级价值和鉴定次数上涨。',
    mount: { y: 0.8, period: 16, mult: 1.2, labelY: 1.35, slots: [[0.06, 0.8, 0.1, 0]] },
    make() {
      const g = new THREE.Group(), d = C.appraisal;
      const t = add(g, F('round_wooden_table_02', { w: 0.95 }));
      const top = t ? t.userData.size.y : 0.8;
      if (!d._cal) { d._cal = 1; d.mount.slots[0][1] = topAt(g, 0.06, 0.1, top) + 0.005; }
      const y = d.mount.slots[0][1];
      const mic = add(g, F('vintage_microscope', { h: 0.46, x: -0.24, y, z: -0.16, ry: 0.5 }));
      const mg = add(g, F('magnifying_glass_01', { h: 0.22, x: 0.3, y, z: -0.08, rz: 0 }));
      g.userData.mic = mic; g.userData.mg = mg; g.userData.mgBase = mg ? mg.position.clone() : null;
      fl(g, -0.28, y, 0.2, 0.3, '#ffd88a');
      return g;
    },
    cols: () => [[-0.48, 0, -0.48, 0.48, 0.8, 0.48]]
  };
  function apprCost(h) { const n = (h.rec.apprN || 0); return Math.round(Math.max(60, h.yield * 45) * Math.pow(1.35, n)); }
  function appraise(b) {
    const h = b.heads && b.heads[0]; if (!h) return false;
    if (b._busy) return true;
    const cost = apprCost(h);
    if (G.S.coins < cost) { G.toast(`🔬 鉴定费 ${fmt(cost)} 魂晶，你不够`, '#ff9a9a', 2); SFX.deny(); return true; }
    G.addCoins(-cost); b._busy = G.clock.elapsedTime;
    const O = ODD(); O.appr = (O.appr || 0) + 1; h.rec.apprN = (h.rec.apprN || 0) + 1;
    let tot = APPR.reduce((s, a) => s + a.w, 0), r = Math.random() * tot, k = 0;
    for (; k < APPR.length - 1; k++) { r -= APPR[k].w; if (r <= 0) break; }
    O.pity = (O.pity || 0) + 1;
    if (O.pity >= 10 && k < 3) k = 3 + (Math.random() < 0.25 ? 1 : 0);
    if (k >= 3) O.pity = 0;
    const cur = h.rec.appr ? APPR.findIndex(a => a.n === h.rec.appr.n) : -1;
    SFX.heartbeat && SFX.heartbeat();
    G.toast(`🔬 斯尼克把眼睛贴上显微镜……<br><small>（鉴定费 -${fmt(cost)} · 保底进度 ${O.pity}/10）</small>`, '#e0d0ff', 1.6);
    later(1500, () => {
      b._busy = 0; if (!alive(h)) return;
      const a = APPR[k], why = WHY[Math.floor(Math.random() * WHY.length)];
      if (k > cur) {
        h.rec.appr = { n: a.n, m: a.m, why }; applyAppr(h, true);
        G.toast(`🔬 <b style="color:${a.c}">${a.n}</b>！「${why}」→ 这颗首级产出永久 ×${a.m}${cur >= 0 ? `（原：${APPR[cur].n}）` : ''}`, a.c, 3.6);
        ft(h, a.n, a.c, 20);
        if (k >= 3) { SFX.fanfare(k - 1); G.flash(a.c); if (G.spawnBeam) try { G.spawnBeam(h.g.position, a.c, Math.min(2, k - 3), k >= 5); } catch (e) {} }
        else SFX.confirm();
      } else {
        G.toast(`🔬 这次看出的是「${a.n}」，不如现有的「${APPR[cur].n}」——品相只升不降，保留原结果。`, '#bbb', 2.6);
        SFX.page();
      }
    });
    return true;
  }
  function applyAppr(h, force) {
    const ap = h.rec.appr; if (!ap) return;
    if (!force && h._apprK === ap.m && h._apprY === h.yield) return;
    const base = G.yieldOf ? G.yieldOf(h.rec) : h.yield;
    h.yield = base * ap.m; h._apprK = ap.m; h._apprY = h.yield;
  }

  // =====================================================================
  // 6) 亡者沙发影院：三人沙发对着一台老电视。E 换台：恐怖 / 喜剧 / 新闻 / 雪花 / 午夜频道
  // =====================================================================
  const CH = [
    { k: 'snow', n: '雪花', c: '#aaa' }, { k: 'horror', n: '恐怖片', c: '#ff5a5a' }, { k: 'comedy', n: '喜剧', c: '#ffd84a' },
    { k: 'news', n: '本台新闻', c: '#6ab0ff' }, { k: 'midnight', n: '午夜频道', c: '#c07aff' }
  ];
  const SOFA_Z = -0.55, TV_Z = 0.78;
  C.tv_couch = {
    cat: 'func', n: '亡者沙发影院', icon: '📺', base: 1600, grow: 1.65, fp: [0.85, 1.0],
    stat: { soul: 3, agi: 1 }, depth: 2, light: '#8ab0ff',
    desc: '一张旧布艺沙发对着一台老式电视。三颗首级并排「坐」在沙发上看电视——追剧值随观看时间上涨，自动产出最高 ×(1.5 + 追剧×2)。空手按 E【换台】：恐怖片（全员吓得发抖，立即 ×2.5）/ 喜剧（全员笑得弹跳，连锁 ×1.8）/ 本台新闻（播报你的累累战绩，按洞中首级数加成）/ 雪花（什么也没有）……据说每换十来次台，会误入一次<b>午夜频道</b>（×8）。换台会让追剧值减半。',
    mount: { y: 0.45, period: 12, mult: 1.5, labelY: 1.0, slots: [-0.5, 0, 0.5].map(x => [x, 0.45, SOFA_Z + 0.02, 0]) },
    make() {
      const g = new THREE.Group(), d = C.tv_couch;
      add(g, F('Sofa_01', { w: 1.6, z: SOFA_Z }));
      const cr = add(g, F('wooden_crate_01', { w: 0.62, z: TV_Z }));
      const ch = cr ? cr.userData.size.y : 0.45;
      const tv = add(g, F('Television_01', { w: 0.62, y: ch, z: TV_Z }));
      if (!d._cal) { d._cal = 1; for (const s of d.mount.slots) s[1] = topAt(g, s[0], s[2], 0.45) + 0.005; }
      // 屏幕：CanvasTexture（画面内容是 2D 界面，不是模型）
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 120;
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.27), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      const tvh = tv ? tv.userData.size.y : 0.46, tvd = tv ? tv.userData.size.z : 0.47;
      scr.position.set(-0.04, ch + tvh * 0.55, TV_Z - tvd / 2 - 0.004); scr.rotation.y = Math.PI; scr.raycast = () => {};
      g.add(scr); g.userData.scr = { cv, tex, mesh: scr, t: 0 };
      return g;
    },
    cols: () => [[-0.8, 0, SOFA_Z - 0.36, 0.8, 0.8, SOFA_Z + 0.3], [-0.32, 0, TV_Z - 0.3, 0.32, 0.95, TV_Z + 0.3]]
  };
  function drawTV(b, now) {
    const S = b.g.userData.scr; if (!S) return;
    if (now - S.t < 0.1) return; S.t = now;
    const x = S.cv.getContext('2d'), W = 160, H = 120, ch = CH[b._ch || 0];
    const on = heads(b).length > 0;
    if (!on && ch.k !== 'snow') { x.fillStyle = '#050505'; x.fillRect(0, 0, W, H); S.tex.needsUpdate = true; return; }
    if (ch.k === 'snow') {
      const im = x.createImageData(W, H); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 200 | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0);
    } else if (ch.k === 'horror') {
      x.fillStyle = '#1a0003'; x.fillRect(0, 0, W, H); const f = Math.random() < 0.12;
      x.fillStyle = f ? '#fff' : '#300'; x.beginPath(); x.ellipse(80, 70, 18, 30, 0, 0, 7); x.fill();
      x.fillStyle = '#ff2a2a'; x.font = 'bold 20px serif'; x.textAlign = 'center'; x.fillText(f ? '在你身后' : '别回头', 80, 26);
    } else if (ch.k === 'comedy') {
      const hue = (now * 90) % 360; x.fillStyle = `hsl(${hue},70%,55%)`; x.fillRect(0, 0, W, H);
      x.fillStyle = '#fff'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.fillText('哈哈哈', 80, 60 + Math.sin(now * 8) * 8);
      x.font = '12px sans-serif'; x.fillText('（罐头笑声）', 80, 100);
    } else if (ch.k === 'news') {
      x.fillStyle = '#0a2a5a'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; x.font = 'bold 14px sans-serif'; x.textAlign = 'left'; x.fillText('魂首窟新闻台', 8, 20);
      x.fillStyle = '#c21'; x.fillRect(0, 84, W, 22); x.fillStyle = '#fff'; x.font = '12px sans-serif';
      const n = G.S.heads.length, t = (G.S.stats && G.S.stats.trips) || 0;
      const msg = `本台讯：近期共有 ${n} 人在各地失踪，目击者称曾见一名高大的食人魔背着麻袋……该食人魔已外出 ${t} 次，请民众夜间关好门窗。`;
      x.fillText(msg, W - ((now * 40) % (msg.length * 12 + W)), 99);
      x.font = '28px sans-serif'; x.fillText('🧌', 64, 66);
    } else {
      x.fillStyle = '#08000f'; x.fillRect(0, 0, W, H); x.fillStyle = '#bda0ff'; x.font = 'bold 16px serif'; x.textAlign = 'center';
      x.fillText('午夜频道', 80, 30); x.font = '40px serif'; x.fillText('🌕', 80, 82); x.font = '11px serif'; x.fillText('只在今晚播出', 80, 108);
    }
    // 扫描线
    x.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
    S.tex.needsUpdate = true;
  }
  function tvSwitch(b) {
    const hs = heads(b); if (!hs.length) return false;
    const now = G.clock.elapsedTime;
    if (b._chT && now - b._chT < 1.2) return true;
    b._chT = now; const O = ODD(); O.tv = (O.tv || 0) + 1;
    let k;
    if (Math.random() < 0.09 || (O.tv % 12 === 0)) k = 4;
    else { k = 1 + Math.floor(Math.random() * 3); if (Math.random() < 0.2) k = 0; if (k === b._ch) k = (k % 3) + 1; }
    b._ch = k; b._binge = (b._binge || 0) * 0.5; b._react = now;
    SFX.click(); const ch = CH[k]; let mul = 0;
    if (k === 1) mul = 2.5; else if (k === 2) mul = 1.8; else if (k === 3) mul = 1.4 + Math.min(3, G.S.heads.length / 40); else if (k === 4) mul = 8;
    if (mul) {
      let sum = 0;
      hs.forEach((h, i) => later(k === 2 ? i * 140 : 60, () => { if (alive(h)) { sum += G.trigger(h, k === 2 ? 'chain' : 'manual', mul); } }));
      later(600, () => G.toast(`📺 换到 <b style="color:${ch.c}">${ch.n}</b>${k === 1 ? '：三颗首级吓得直哆嗦' : k === 2 ? '：沙发上笑成一团' : k === 3 ? '：主播正在播报你的「光辉事迹」' : '：屏幕里的月亮……在看着她们'} · +${fmt(sum)} 魂晶`, ch.c, 3));
      if (k === 4) { SFX.fanfare(4); G.flash('#8a4aff'); }
    } else G.toast('📺 只有雪花……沙沙沙', '#bbb', 1.6);
    return true;
  }

  // =====================================================================
  // 7) 首级菜园：花槽里「种」着首级，只露出脸；浇水长花，成熟收获
  // =====================================================================
  const GAR_X = [-0.36, 0, 0.36];
  C.head_garden = {
    cat: 'func', n: '首级菜园', icon: '🌷', base: 800, grow: 1.6, fp: [0.8, 0.35],
    stat: { con: 2, soul: 2 }, depth: 1,
    desc: '一只木花槽，旁边站着花园侏儒、放着铁皮水壶。把首级「种」进去——只露出脸，像一排卷心菜。空手按 E【浇水】：土壤半干时浇水，菜苗长一阶（共 3 阶，花一圈圈开出来）；土还湿着就浇 = 涝了，不长还断连击。长满后按 E【收获】×(4 + 连续完美收获×1.5)！太久不浇会枯萎掉阶。',
    mount: { y: 0.4, period: 14, mult: 1.3, labelY: 1.0, slots: GAR_X.map(x => [x, 0.4, 0, 0]) },
    make() {
      const g = new THREE.Group(), d = C.head_garden;
      const bx = add(g, F('planter_box_01', { w: 1.12 }));
      const h = bx ? bx.userData.size.y : 0.5;
      // 土层：用现成 CC0 岩地贴图的平面（不是自制贴图）
      const T = A.tex && A.tex('rock_ground');
      const soilM = new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 1, map: T ? T.diff : null });
      const soil = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.36), soilM); soil.rotation.x = -Math.PI / 2; soil.position.y = h - 0.05; soil.receiveShadow = true; soil.raycast = () => {};
      g.add(soil); g.userData.soil = soil;
      if (!d._cal) { d._cal = 1; d._soilY = h - 0.05; for (const s of d.mount.slots) s[1] = h - 0.05 - 0.07; }
      g.userData.flowers = GAR_X.map(x => { const f = F('flower_ursinia', { w: 0.28, x: x + 0.04, y: h - 0.05, z: 0.1 }); if (f) { f.scale.setScalar(0.001); g.add(f); } return f; });
      add(g, F('garden_gnome', { h: 0.42, x: 0.72, z: 0.1, ry: -0.5 }));
      const can = add(g, F('watering_can_metal_01', { h: 0.2, x: -0.72, z: 0.12, ry: 0.8 }));
      g.userData.can = can; g.userData.canBase = can ? can.position.clone() : null;
      return g;
    },
    cols: () => [[-0.56, 0, -0.21, 0.56, 0.45, 0.21]]
  };
  function gState(b) { return b._gd || (b._gd = { st: [0, 0, 0], wet: 0, dry: 0, streak: 0, over: false }); }
  function garden(b) {
    const hs = heads(b); if (!hs.length) return false;
    const s = gState(b), now = G.clock.elapsedTime;
    if (b._canT && now - b._canT < 1.3) return true;
    const ripe = b.heads.every((h, i) => !h || s.st[i] >= 3);
    if (ripe) {
      const mul = 4 + s.streak * 1.5; let sum = 0;
      b.heads.forEach((h, i) => { if (!h) return; later(i * 220, () => { if (!alive(h)) return; sum += G.trigger(h, 'manual', mul); G.burst(h.g.position.clone().add(new V3(0, 0.1, 0)), '#ff9ad8', 26, 1.4, 0.9, -2); SFX.soul(i + 2, h.rec.c.rar); ft(h, '🌸', '#ffb0e0', 22); memory(h, 0.08); }); s.st[i] = 0; });
      if (!s.over) s.streak = Math.min(8, s.streak + 1); else s.streak = 0;
      s.over = false; ODD().garden = (ODD().garden || 0) + 1;
      later(800, () => { G.toast(`🌷 <b>大丰收</b> ×${mul.toFixed(1)}${s.streak > 1 ? ` · 完美收获 ${s.streak} 连` : ''} · +${fmt(sum)} 魂晶`, '#ffb0e0', 3.2); SFX.fanfare(Math.min(3, 1 + (s.streak >> 1))); });
      return true;
    }
    b._canT = now;
    SFX.play('sack', 0.25, 1.6);
    if (s.wet > 0.5) {
      s.over = true; s.wet = 1; s.streak = 0;
      G.toast('🌷 土还湿着就浇——<b>涝了</b>！这一阶白浇了，完美连击中断。等土色变浅再浇。', '#8ab8ff', 2.6);
      return true;
    }
    s.wet = 1; s.dry = 0; let grew = 0;
    b.heads.forEach((h, i) => { if (h && s.st[i] < 3) { s.st[i]++; grew++; later(300 + i * 150, () => { if (alive(h)) { G.trigger(h, 'manual', 0.6); G.burst(h.g.position.clone().add(new V3(0, 0.12, 0)), '#6aff8a', 10, 0.8, 0.7, -1); } }); } });
    const top = Math.min(...b.heads.map((h, i) => (h ? s.st[i] : 3)));
    G.toast(top >= 3 ? '🌷 花全开了！<b>再按 E 收获</b>' : `🌷 浇水 · 菜苗长到第 ${top} 阶（共 3 阶）——等土色变浅再浇`, '#9affb0', 2.2);
    return true;
  }

  // =====================================================================
  // 解锁条件（接 Unlocks.R：未达成显示 ???，达成弹窗说明原因）
  // =====================================================================
  (function unlocks() {
    if (!window.Unlocks || !Unlocks.R) return;
    const R = Unlocks.R;
    const H = S => S.heads.length, E = S => (S.stats && S.stats.earned) || 0, T = S => (S.stats && S.stats.trips) || 0;
    const maxRar = S => S.heads.reduce((m, r) => Math.max(m, r.c.rar), -1);
    const locs = S => new Set(S.heads.map(r => r.c.loc)).size;
    R.rocker = [S => H(S) >= 2 && T(S) >= 1, '你从村子里拖回一把没人坐的旧摇椅。坐上去吱呀吱呀的……也许该让别人坐。'];
    R.head_garden = [S => T(S) >= 2, '出猎路上你顺手捡了个花槽和一只花园侏儒。侏儒一直盯着你背后的麻袋。'];
    R.tea_party = [S => H(S) >= 4, '洞里正好四颗首级——刚好凑一桌茶会。'];
    R.portrait_gallery = [S => maxRar(S) >= 1 && H(S) >= 5, '你翻出几幅空画框：比起风景，画中人更需要一张好脸。'];
    R.tv_couch = [S => S.depth >= 2 && H(S) >= 6, '地精斯尼克不知从哪儿扛来一台会亮的铁箱子：「放给她们看，她们会安静的。」'];
    R.trophy_lodge = [S => S.depth >= 2 && T(S) >= 4 && locs(S) >= 2, '你的首级来自不止一个地方了——猎人都会给战利品配一张纪念台。'];
    R.appraisal = [S => S.depth >= 2 && H(S) >= 8 && E(S) >= 2500, '斯尼克戴上单片眼镜：「同是神魂，品相可差得远呢。要不要我给你看看？」'];
  })();

  // =====================================================================
  // 每帧动画 / 交互钩子
  // =====================================================================
  const _v = new V3();
  function tick(dt, now) {
    if (!G.builds) return;
    for (const b of G.builds) {
      const t = b.type;
      if (t === 'tea_party') {
        const sip = b._sip || [];
        for (let i = 0; i < 4; i++) { const h = b.heads[i]; if (!h || h === G.held) continue; const k = sip[i] ? Math.max(0, 1 - (now - sip[i]) / 0.9) : 0; if (k > 0 || b._teaDirty) reseat(b, i, { rx: Math.sin(k * Math.PI) * 0.35, dy: -Math.sin(k * Math.PI) * 0.02 }); }
        b._teaDirty = sip.some(s => s && now - s < 1);
        const pot = b.g.userData.pot; if (pot) { const k = b._pour ? Math.max(0, 1 - (now - b._pour) / 2.1) : 0; pot.rotation.z = Math.sin(Math.min(1, k * 3) * Math.PI / 2) * (k > 0 ? 0.5 : 0); }
      } else if (t === 'portrait_gallery') {
        const U = b.g.userData; if (!U.frames) continue;
        for (let i = 0; i < 3; i++) {
          const h = b.heads[i], want = h ? tierOf(h) : -1;
          if (U.ftier[i] !== want && setFrame(b.g, i, want) && h && want >= 0) {
            ft(h, `🖼️ ${FRAME_N[want]}`, RARC[want], 15); if (want >= 3) { SFX.metal(); G.burst(h.g.position.clone().add(new V3(0, 0.2, -0.1)), '#ffd84a', 22, 1, 0.8, -1); }
          }
        }
      } else if (t === 'rocker') {
        const rig = b.g.userData.rig; if (!rig) continue;
        const h = b.heads[0];
        b._calm = h ? Math.min(1, (b._calm || 0) + dt / 150) : 0;
        b._push = Math.max(0, (b._push || 0) - dt * 0.35);
        const amp = 0.04 + (h ? 0.03 : 0) + b._push * 0.3;
        b._ph = (b._ph || 0) + dt * (1.6 + b._push * 2.5);
        rig.rotation.x = Math.sin(b._ph) * amp;
        if (h && h !== G.held) {
          const d = C.rocker, s = d.mount.slots[0];
          rig.updateMatrixWorld(true);
          const p = rig.localToWorld(_v.set(s[0], s[1] - 0.02, s[2]));
          const q = rig.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12, 0, Math.sin(now * 0.3) * 0.05)));
          seatAt(h, p, q);
          if (b._calm > 0.3 && Math.random() < dt * 0.25) ft(h, b._calm >= 1 ? '💤💤💤' : 'z', '#bcd0ff', b._calm >= 1 ? 16 : 13);
        }
        // 自动产出随安睡值变强：在基础倍率之上补发差额
        if (h && b.timer < (b._lastT || 0)) { const extra = (1 + b._calm * 4) - 1; if (extra > 0.05) G.trigger(h, 'auto', C.rocker.mount.mult * extra); }
        b._lastT = b.timer;
      } else if (t === 'trophy_lodge') {
        const lv = fameLv(ODD().fame || 0);
        if (lv && b.heads && b.timer < (b._lastT || 0)) for (const h of heads(b)) G.trigger(h, 'auto', C.trophy_lodge.mount.mult * lv * 0.15);
        b._lastT = b.timer;
      } else if (t === 'appraisal') {
        const U = b.g.userData;
        if (U.mg && U.mgBase) { const k = b._busy ? now - b._busy : -1; if (k >= 0 && k < 1.5) { U.mg.position.set(U.mgBase.x - 0.28 + Math.sin(k * 7) * 0.08, U.mgBase.y + 0.18, U.mgBase.z + 0.1); U.mg.rotation.x = -0.9; } else { U.mg.position.copy(U.mgBase); U.mg.rotation.x = 0; } }
      } else if (t === 'tv_couch') {
        drawTV(b, now);
        const hs = heads(b);
        if (hs.length && (b._ch || 0) !== 0) b._binge = Math.min(120, (b._binge || 0) + dt);
        if (hs.length && b.timer < (b._lastT || 0)) { const extra = (b._binge || 0) / 60; if (extra > 0.05) for (const h of hs) G.trigger(h, 'auto', C.tv_couch.mount.mult * extra); }
        b._lastT = b.timer;
        const rk = b._react ? now - b._react : 99, ch = b._ch || 0;
        for (let i = 0; i < 3; i++) {
          const h = b.heads[i]; if (!h || h === G.held) continue;
          if (ch === 1 && rk < 6) reseat(b, i, { off: new V3(Math.sin(now * 40 + i) * 0.006, 0, 0), rx: 0.08 });
          else if (ch === 2 && rk < 6) reseat(b, i, { dy: Math.abs(Math.sin(now * 9 + i * 1.3)) * 0.05, rz: Math.sin(now * 9 + i) * 0.08 });
          else if (ch === 4 && rk < 8) reseat(b, i, { rx: -0.15, ry: Math.sin(now * 0.8 + i) * 0.05 });
          else if (b._tvDirty) reseat(b, i, { rz: 0.06 * (i - 1) });
        }
        b._tvDirty = rk < 9;
      } else if (t === 'head_garden') {
        const s = gState(b), U = b.g.userData;
        const any = heads(b).length > 0;
        s.wet = Math.max(0, s.wet - dt / 18);
        if (any && s.wet <= 0) { s.dry += dt; if (s.dry > 60) { s.dry = 30; for (let i = 0; i < 3; i++) if (s.st[i] > 0) s.st[i]--; if (s.st.some(Boolean) || true) G.toast('🥀 首级菜园太久没浇水，菜苗蔫了一阶', '#c8a070', 2); } }
        if (U.soil) U.soil.material.color.setRGB(0.23 - s.wet * 0.12, 0.165 - s.wet * 0.09, 0.118 - s.wet * 0.06);
        (U.flowers || []).forEach((f, i) => { if (!f) return; const want = b.heads[i] ? [0.001, 0.45, 0.75, 1.05][s.st[i]] : 0.001; const cur = f.scale.x; f.scale.setScalar(cur + (want - cur) * Math.min(1, dt * 3)); if (s.st[i] >= 3 && b.heads[i]) f.rotation.y += dt * 0.3; });
        if (U.can && U.canBase) { const k = b._canT ? now - b._canT : 9; if (k < 1.2) { const i = Math.min(2, Math.floor(k / 0.4)); U.can.position.set(GAR_X[i] + 0.15, U.canBase.y + 0.45, 0.05); U.can.rotation.z = 0.7; if (Math.random() < 0.6) G.burst(b.g.localToWorld(new V3(GAR_X[i], 0.6, 0.05)), '#8ad0ff', 2, 0.4, 0.5, -6); } else { U.can.position.copy(U.canBase); U.can.rotation.z = 0; } }
      }
    }
    // 鉴定品相：常驻作用于首级产出（rebuildHead 后也会补回）
    if (!tick._t || now - tick._t > 1) { tick._t = now; for (const h of G.heads) if (h.rec && h.rec.appr) applyAppr(h); }
  }

  function onE(hit, held, pickup) {
    const b = hit && hit.build; if (!b || held || pickup) return false;
    switch (b.type) {
      case 'tea_party': return teaPour(b);
      case 'portrait_gallery': return galCritic(b);
      case 'trophy_lodge': return boast(b);
      case 'appraisal': return appraise(b);
      case 'tv_couch': return tvSwitch(b);
      case 'head_garden': return garden(b);
      case 'rocker': {
        const h = b.heads[0]; if (!h) return false;
        if (!cool(b, 'push', 4, '🪑 摇椅还在晃')) return true;
        const calm = b._calm || 0, mul = 2 + calm * 10;
        const v = G.trigger(h, 'manual', mul); b._calm = 0; b._push = 1;
        G.burst(h.g.position, calm >= 1 ? '#ffd84a' : '#bcd0ff', 10 + Math.round(calm * 40), 1 + calm, 0.9, -1);
        if (calm >= 1) { SFX.fanfare(3); G.flash('#ffd84a'); }
        else SFX.play('wood', 0.5, 0.8);
        G.toast(calm >= 1 ? `🪑 <b>一觉睡到天荒地老</b>：安睡值满！×${mul.toFixed(1)} · +${fmt(v)} 魂晶` : calm < 0.2 ? `🪑 她还没睡熟就被你推醒了 ×${mul.toFixed(1)} · +${fmt(v)} 魂晶` : `🪑 推一把：安睡 ${Math.round(calm * 100)}% ×${mul.toFixed(1)} · +${fmt(v)} 魂晶`, '#cfe0ff', 3);
        return true;
      }
    }
    return false;
  }

  function onTip(hit, held) {
    const b = hit && hit.build; if (!b || !C[b.type] || !b.type) return null;
    const d = C[b.type], hs = heads(b), n = b.heads ? b.heads.length : 0;
    if (held) return null;
    if (hit.head && b.type !== 'appraisal') return null;
    const cnt = `（${hs.length}/${n}）`;
    switch (b.type) {
      case 'tea_party': return `<b>🫖 亡者茶会</b>${cnt} · <b>[E]</b> 斟茶${b._streak ? ` · 续杯 ${b._streak} 连` : ''} · 手持首级按 E 请她入座`;
      case 'portrait_gallery': { const r = galScore(b); return `<b>🖼️ 名媛肖像廊</b>${cnt}${r ? ` · 当前 ${r.grade} 级 ${r.sc} 分` : ''} · 最高 ${ODD().galBest || 0} · <b>[E]</b> 鉴赏会`; }
      case 'rocker': return hs.length ? `<b>🪑 奶奶的摇椅</b> · 安睡 ${Math.round((b._calm || 0) * 100)}% · <b>[E]</b> 推一把（×${(2 + (b._calm || 0) * 10).toFixed(1)}）` : '<b>🪑 奶奶的摇椅</b> · 手持首级按 E 放上靠垫';
      case 'trophy_lodge': { const f = ODD().fame || 0, lv = fameLv(f); return `<b>🦁 猎首纪念台</b>${cnt} · 猎名 ${f}「${FAME[lv][1]}」${lv < FAME.length - 1 ? `（下一级 ${FAME[lv + 1][0]}）` : ''} · <b>[E]</b> 炫耀战绩`; }
      case 'appraisal': { const h = b.heads[0]; if (!h) return '<b>🔬 首级鉴定台</b> · 手持首级按 E 放上台面'; const ap = h.rec.appr; return `<b>🔬 首级鉴定台</b> · 「${esc(h.rec.c.name)}」品相：${ap ? `<b>${ap.n}</b> ×${ap.m}` : '未鉴定'} · <b>[E]</b> 鉴定（${fmt(apprCost(h))} 魂晶 · 保底 ${ODD().pity || 0}/10）`; }
      case 'tv_couch': return `<b>📺 亡者沙发影院</b>${cnt} · 正在播：${CH[b._ch || 0].n} · 追剧 ${Math.round((b._binge || 0) / 1.2)}% · <b>[E]</b> 换台`;
      case 'head_garden': { const s = gState(b); const top = Math.min(...b.heads.map((h, i) => (h ? s.st[i] : 3))); return `<b>🌷 首级菜园</b>${cnt} · 土壤 ${s.wet > 0.5 ? '💧湿（别浇）' : s.wet > 0 ? '半干（正好浇）' : '干透'} · ${hs.length && top >= 3 ? '<b>[E]</b> 收获' : `<b>[E]</b> 浇水（${hs.length ? top : 0}/3 阶）`}${s.streak ? ` · 完美 ${s.streak} 连` : ''}`; }
    }
    return null;
  }

  // 左键戳摇椅上的首级 = 吵醒（安睡 -30%）
  function onClick() {
    if (G.held) return false;
    const hit = G.lookHit && G.lookHit(), h = hit && hit.head;
    if (h && h.mount && h.mount.type === 'rocker') { const b = h.mount; if ((b._calm || 0) > 0.05) { b._calm = Math.max(0, b._calm - 0.3); ft(h, '💢 吵醒了', '#ffb0b0', 14); } }
    return false;
  }

  const wait = setInterval(() => {
    if (!window.G || !G.HOOK) return;
    clearInterval(wait);
    G.HOOK.frame.push(tick); G.HOOK.e.push(onE); G.HOOK.tip.push(onTip); G.HOOK.click.push(onClick);
    if (window.Unlocks && Unlocks.scan && G.S) try { Unlocks.scan(true); } catch (e) {}
  }, 150);

  return { APPR, CH, galScore, _dbg: { teaPour, galCritic, boast, appraise, tvSwitch, garden, gState } };
})();
