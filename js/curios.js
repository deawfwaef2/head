// 第二十二轮（续 4）· 「首级日用品」——6 座新的放首级建筑（MOD：curios，默认开）
// 与 oddities/rites/sanctum 不重复：
//   🕰 布谷钟（首级在钟里，整点报时爆发）  🥤 魂饮自贩机（首级当样品，出材料）  🎡 魂盘赌局（轮盘转首级，押魂晶）
//   🎹 亡者琴键（七颗首级弹音阶）          🥢 结义坛（三颗首级看缘分）          🔨 落槌拍卖台（竞价水涨船高）
// 只通过 BuildCat.C / Unlocks.R / G.HOOK 挂载；首级不说话（第八轮规则），只有数字与音效。
window.Curios = (() => {
  if (window.Mods && Mods.on && !Mods.on('curios')) return { off: true };
  const BC = window.BuildCat, A = window.Assets;
  if (!BC) return {};
  const C = BC.C, M = BC.M, V3 = THREE.Vector3, HS = 1.55, { box, cyl, mesh, std, glowMat } = BC;
  const F = (n, o) => (A && A.has(n) ? A.fit(n, o) : null);
  const add = (g, o) => { if (o) g.add(o); return o; };
  const fmt = n => (window.G && G.fmtN) ? G.fmtN(n) : String(Math.round(n));
  const heads = b => (b.heads || []).filter(Boolean);
  const RARC = ['#b8b8c0', '#4aa8ff', '#c05aff', '#ffb020', '#ff4a8a'];
  const red = std('#7a1418', { roughness: 0.9, side: THREE.DoubleSide }), velvet = std('#4a0e22', { roughness: 1 }), felt = std('#1d5a3a', { roughness: 1 });
  const table = std('#8a6238', { roughness: 0.75 }), brass = std('#c9a24a', { metalness: 0.9, roughness: 0.35 }), ivory = std('#eee6d0', { roughness: 0.5 }), ebony = std('#15110f', { roughness: 0.35 });

  // ---- 与 oddities.js 相同的插槽→世界换算（首级切口中心对准插槽） ----
  const _so = new V3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
  function seatAt(h, pos, quat) {
    h.g.quaternion.copy(quat);
    const m = h.hb.meta || {}, cut = m.cut || { x: 0, y: m.bottom != null ? m.bottom : -0.1, z: 0 };
    _so.set((cut.x || 0) * HS, (cut.y != null ? cut.y : -0.1) * HS - 0.005, (cut.z || 0) * HS).applyQuaternion(quat);
    h.g.position.copy(pos).sub(_so);
  }
  function slotWorld(b, s, dy = 0) { const a = -b.rot * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a); return new V3(b.x + s[0] * c + s[2] * sn, s[1] - 0.02 + dy, b.z - s[0] * sn + s[2] * c); }
  function slotQuat(b, s, rx = 0, rz = 0, ry = 0) { _e.set(rx, -b.rot * Math.PI / 2 + (s[3] != null ? s[3] : Math.PI) + ry, rz, 'YXZ'); return _q.setFromEuler(_e).clone(); }
  // slot：可临时替换插槽（转盘上的首级随盘旋转）；off：本地偏移（x,y,z 按建筑朝向旋转）
  function reseat(b, i, o = {}) {
    const h = b.heads && b.heads[i]; if (!h || h === G.held) return;
    const s = o.slot || C[b.type].mount.slots[i], a = -b.rot * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a), f = o.off || [0, 0, 0];
    const p = slotWorld(b, s, o.dy || 0); p.x += f[0] * c + f[2] * sn; p.z += -f[0] * sn + f[2] * c; p.y += f[1];
    seatAt(h, p, slotQuat(b, s, o.rx || 0, o.rz || 0, o.ry || 0));
  }
  function cool(b, key, sec, label) {
    const now = G.clock.elapsedTime; b._cd = b._cd || {};
    if (b._cd[key] && now < b._cd[key]) { G.toast(`${label}（${Math.ceil(b._cd[key] - now)} 秒）`, '#bbb', 1.4); return false; }
    b._cd[key] = now + sec; return true;
  }
  const ft = (h, t, c, s) => G.floatText(t, h.g.position.clone().add(new V3(0, 0.38, 0)), c, s || 16);
  const later = (ms, f) => setTimeout(() => { try { f(); } catch (e) { console.warn('curios', e); } }, ms);
  const alive = h => h && window.G && G.heads.includes(h);
  const ease = (a, b, k) => a + (b - a) * Math.min(1, k);
  const ring = (g, r, y, mat, n = 6) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; g.add(box(0.03, 0.03, 0.03, mat, Math.sin(a) * r, y, Math.cos(a) * r)); } };

  // =====================================================================
  // 1) 布谷钟：落地大摆钟，顶上的小木屋里关着首级；时辰到了木门弹开，首级被弹簧推出来报时
  // =====================================================================
  C.cuckoo = {
    cat: 'func', n: '布谷钟', icon: '🕰️', base: 900, grow: 1.7, fp: [0.42, 0.3],
    stat: { agi: 2 }, depth: 1, light: '#ffcf88',
    desc: '一座落地大摆钟，顶上的小木屋里关着首级。每 45 秒木门弹开，首级被弹簧推出来「布谷——」：自动产出 ×4。空手按 E【拨针】：立刻催她报时（冷却 12 秒）。<b>现实时间每逢整点</b>，她会额外连敲当前钟点数（最多 12 下），每下一次产出。',
    mount: { y: 1.52, period: 45, mult: 4, labelY: 2.1, slots: [[0, 1.52, 0.02, 0]] },
    make() {
      const g = new THREE.Group(), U = g.userData;
      g.add(box(0.62, 0.12, 0.42, M.wood, 0, 0.06, 0)); g.add(box(0.5, 1.12, 0.34, M.wood, 0, 0.66, 0));
      g.add(box(0.56, 0.06, 0.38, M.wood, 0, 1.25, 0));
      // 钟面 + 指针
      const face = cyl(0.17, 0.17, 0.02, ivory, 0, 0.98, 0.176, 24); face.rotation.x = Math.PI / 2; g.add(face);
      const rim = cyl(0.19, 0.19, 0.015, brass, 0, 0.98, 0.17, 24); rim.rotation.x = Math.PI / 2; g.add(rim);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(box(0.012, i % 3 ? 0.02 : 0.035, 0.008, ebony, Math.sin(a) * 0.15, 0.98 + Math.cos(a) * 0.15, 0.19)); g.children[g.children.length - 1].rotation.z = -a; }
      const hm = new THREE.Group(); hm.position.set(0, 0.98, 0.195); const hh = box(0.012, 0.11, 0.008, ebony, 0, 0.05, 0); hm.add(hh); g.add(hm); U.hMin = hm;
      const hhr = new THREE.Group(); hhr.position.set(0, 0.98, 0.198); hhr.add(box(0.016, 0.075, 0.008, ebony, 0, 0.035, 0)); g.add(hhr); U.hHour = hhr;
      // 摆锤
      const pend = new THREE.Group(); pend.position.set(0, 0.74, 0.18); pend.add(box(0.012, 0.3, 0.008, brass, 0, -0.15, 0)); const bob = cyl(0.06, 0.06, 0.015, brass, 0, -0.32, 0, 20); bob.rotation.x = Math.PI / 2; pend.add(bob); g.add(pend); U.pend = pend;
      g.add(box(0.26, 0.3, 0.012, ebony, 0, 0.6, 0.176)); // 摆腔玻璃
      // 顶上的小木屋：三面墙 + 人字屋顶 + 对开门
      g.add(box(0.64, 0.46, 0.06, M.wood, 0, 1.51, -0.16)); g.add(box(0.06, 0.46, 0.4, M.wood, -0.3, 1.51, 0)); g.add(box(0.06, 0.46, 0.4, M.wood, 0.3, 1.51, 0));
      g.add(box(0.64, 0.04, 0.4, M.wood, 0, 1.3, 0.02));
      for (const s of [-1, 1]) { const r = box(0.44, 0.04, 0.5, M.dark, s * 0.2, 1.84, 0); r.rotation.z = -s * 0.7; g.add(r); }
      g.add(box(0.05, 0.05, 0.05, brass, 0, 1.98, 0));
      const dl = box(0.3, 0.44, 0.03, M.rust, -0.15, 0, 0), dr = box(0.3, 0.44, 0.03, M.rust, 0.15, 0, 0);
      const pl = new THREE.Group(), pr = new THREE.Group(); pl.position.set(-0.3, 1.51, 0.23); pr.position.set(0.3, 1.51, 0.23); dl.position.x = 0.15; dr.position.x = -0.15; pl.add(dl); pr.add(dr); g.add(pl, pr); U.dl = pl; U.dr = pr;
      // 弹簧
      const sp = cyl(0.03, 0.03, 0.2, brass, 0, 1.38, -0.04, 8); g.add(sp); U.spring = sp;
      const l = new THREE.PointLight('#ffcf88', 0.0, 2); l.position.set(0, 1.6, 0.4); g.add(l); U.lamp = l;
      return g;
    },
    cols: () => [[-0.31, 0, -0.21, 0.31, 2.0, 0.21]]
  };
  function tickCuckoo(b, dt, now) {
    const U = b.g.userData, per = C.cuckoo.mount.period, tm = b.timer || 0;
    if (b._lt != null && tm < b._lt - 5) { b._outUntil = now + 1.7; SFX.play && SFX.play('wood', 0.6, 1.3); if (window.SFX && SFX.bell) SFX.bell(); } b._lt = tm;
    const want = tm > per - 1.6 || now < (b._outUntil || 0) || b._strikes > 0;
    b._pop = ease(b._pop || 0, want ? 1 : 0, dt * 7);
    const k = b._pop; U.dl.rotation.y = k * 1.9; U.dr.rotation.y = -k * 1.9; U.spring.scale.y = 1 + k * 0.9;
    U.pend.rotation.z = Math.sin(now * 3.1) * 0.35; const t = new Date();
    U.hMin.rotation.z = -(t.getMinutes() + t.getSeconds() / 60) / 60 * Math.PI * 2; U.hHour.rotation.z = -((t.getHours() % 12) + t.getMinutes() / 60) / 12 * Math.PI * 2;
    U.lamp.intensity = k * 0.8;
    if (b.heads[0]) reseat(b, 0, { off: [0, 0, 0.3 * k - 0.16 * (1 - k)], dy: 0, rx: -0.12 * k });
    // 整点报时
    const hr = t.getHours(), key = t.toDateString() + hr;
    if (t.getMinutes() === 0 && b._hr !== key && b.heads[0]) {
      b._hr = key; const n = Math.min(12, (hr % 12) || 12); b._strikes = n; b._stT = 0;
      G.toast(`🕰️ <b>布谷——</b>整点了。她会连敲 ${n} 下。`, '#ffd9a0', 3);
    } else if (!b._hr && t.getMinutes() === 0) b._hr = key;
    if (b._strikes > 0) {
      b._stT += dt; if (b._stT > 0.75) {
        b._stT = 0; b._strikes--; const h = b.heads[0];
        if (h) { G.trigger(h, 'manual', 1.5); ft(h, `布谷 ×${12 - b._strikes - (12 - Math.min(12, (hr % 12) || 12))}`, '#ffe8b0', 14); G.burst(h.g.position, '#ffd9a0', 8, 0.8, 0.5, -1); SFX.play && SFX.play('heavy', 0.35, 1.6 + (b._strikes % 3) * 0.12); }
        else b._strikes = 0;
      }
    }
  }
  function eCuckoo(b) {
    const h = b.heads[0]; if (!h) return false; if (!cool(b, 'turn', 12, '🕰️ 发条还没上好')) return true;
    b.timer = Math.max(b.timer || 0, C.cuckoo.mount.period - 1.5); SFX.play && SFX.play('wood', 0.5, 0.8);
    G.toast('🕰️ 你把分针硬生生拨到了整点——她被弹簧推了出来。', '#ffd9a0', 2); return true;
  }

  // =====================================================================
  // 2) 魂饮自贩机：首级摆在展示窗里当样品；出货口定时出材料，空手按 E 取货，没货就投币买药
  // =====================================================================
  const VEND_POOL = ['iron', 'dust', 'cloth', 'herb', 'bone', 'hide', 'wood', 'dust', 'cloth'];
  C.vending = {
    cat: 'func', n: '魂饮自动贩卖机', icon: '🥤', base: 1200, grow: 1.7, fp: [0.5, 0.42],
    stat: { con: 2 }, depth: 1, light: '#7ad0ff',
    desc: '一台亮着蓝光的铁皮机器，展示窗里摆着「样品」。有首级在窗里时，每 50 秒吐出一份材料（最多存 8 份；魂阶越高越可能出血玉，还会出骨、筋、蜡这类道具原料）。空手按 E 取货；出货口空了就投 60 魂晶换一瓶药剂。首级还会自动 ×1.3 产出。',
    mount: { y: 1.12, period: 30, mult: 1.3, labelY: 1.75, slots: [[0, 1.12, 0.06, 0]] },
    make() {
      const g = new THREE.Group(), U = g.userData, body = std('#2b3946', { metalness: 0.7, roughness: 0.4 });
      g.add(box(0.82, 1.78, 0.6, body, 0, 0.89, 0)); g.add(box(0.86, 0.06, 0.64, M.iron, 0, 1.79, 0)); g.add(box(0.86, 0.06, 0.64, M.iron, 0, 0.03, 0));
      // 展示窗（内壁发光）+ 玻璃
      g.add(box(0.56, 0.5, 0.02, glowMat('#6fc2ff', 0.9), -0.08, 1.12, -0.26));
      const glass = box(0.58, 0.54, 0.01, std('#bfe8ff', { transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false }), -0.08, 1.12, 0.3); g.add(glass);
      g.add(box(0.6, 0.05, 0.4, M.iron, -0.08, 0.86, 0.04)); g.add(box(0.6, 0.05, 0.05, M.iron, -0.08, 1.39, 0.29));
      // 上排饮料瓶（各色）
      const cols = ['#ff4a5a', '#4aff9a', '#ffd84a', '#b04aff', '#4ab0ff'];
      for (let i = 0; i < 5; i++) { const bt = cyl(0.045, 0.045, 0.16, std(cols[i], { emissive: cols[i], emissiveIntensity: 0.4, roughness: 0.3 }), -0.26 + i * 0.12, 1.62, 0.12, 10); g.add(bt); g.add(cyl(0.02, 0.02, 0.05, M.iron, -0.26 + i * 0.12, 1.73, 0.12, 8)); }
      g.add(box(0.6, 0.04, 0.3, M.iron, -0.08, 1.52, 0.12));
      // 按钮 + 投币口 + 出货口
      for (let i = 0; i < 4; i++) g.add(box(0.05, 0.03, 0.02, glowMat(cols[i], 1.6), 0.3, 1.3 - i * 0.08, 0.31));
      g.add(box(0.1, 0.16, 0.02, M.dark, 0.3, 0.92, 0.305)); g.add(box(0.03, 0.08, 0.02, glowMat('#ffd84a', 1.8), 0.3, 0.92, 0.318));
      g.add(box(0.6, 0.22, 0.04, M.dark, 0, 0.36, 0.3)); const flap = box(0.5, 0.16, 0.012, std('#111', { transparent: true, opacity: 0.65 }), 0, 0.36, 0.325); g.add(flap);
      const lamp = glowMat('#ffd8a0', 1.4); U.lamp = box(0.5, 0.03, 0.02, lamp, -0.08, 1.85 - 0.06, 0.3); g.add(U.lamp);
      // 出货口里的“在库”显示：小方块数量随库存
      U.stock = []; for (let i = 0; i < 8; i++) { const c = box(0.05, 0.05, 0.03, glowMat('#7ad0ff', 1.6), -0.22 + i * 0.065, 0.12, 0.31); c.visible = false; g.add(c); U.stock.push(c); }
      return g;
    },
    cols: () => [[-0.42, 0, -0.31, 0.42, 1.85, 0.31]]
  };
  function vendRoll(rar) {
    const P = window.Props && Props.matPool ? Props.matPool() : [];
    let id = (P.length && Math.random() < 0.4) ? P[Math.floor(Math.random() * P.length)] : VEND_POOL[Math.floor(Math.random() * VEND_POOL.length)];
    if (Math.random() < 0.03 + rar * 0.05) id = 'gem';
    return id;
  }
  function tickVend(b, dt, now) {
    const U = b.g.userData, h = b.heads[0]; b._stock = b._stock || [];
    if (h) { b._vt = (b._vt || 0) + dt; if (b._vt >= 50) { b._vt = 0; if (b._stock.length < 8) { b._stock.push(vendRoll(h.rec.c.rar || 0)); SFX.play && SFX.play('coin', 0.35, 1.3); } } }
    U.stock.forEach((c, i) => { c.visible = i < b._stock.length; });
    U.lamp.visible = (Math.floor(now * 2) % 2 === 0) || b._stock.length > 0;
    reseat(b, 0, { rx: 0.0 });
  }
  function eVend(b) {
    const Sk = window.Sack; if (!Sk || !Sk.inv) return false;
    if (b._stock && b._stock.length) {
      const got = {}; for (const id of b._stock) got[id] = (got[id] || 0) + 1; b._stock.length = 0;
      for (const id in got) if (Sk.IT[id]) Sk.stashAdd(Sk.mk(id, got[id]));
      SFX.play && SFX.play('coin', 0.6, 0.9);
      G.toast('🥤 哐当——取货：' + Object.entries(got).map(([k, n]) => `${Sk.IT[k] ? Sk.IT[k].n : k}×${n}`).join('、') + '（已入储物箱）', '#9fe0ff', 3); G.save && G.save(); return true;
    }
    if (G.S.coins < 60) { SFX.deny && SFX.deny(); G.toast('🥤 出货口空了，投币口闪着红灯（需要 60 魂晶）', '#f88', 2); return true; }
    G.S.coins -= 60; Sk.stashAdd(Sk.mk('potion', 1)); SFX.play && SFX.play('coin', 0.6, 1.1); G.toast('🥤 投币 60 魂晶——哐当，滚出一瓶药剂（已入储物箱）', '#9fe0ff', 2.5); return true;
  }

  // =====================================================================
  // 3) 魂盘赌局：轮盘台，六格凹槽里各放一颗首级，盘一转首级们跟着绕圈；球落在谁那里谁就赢
  // =====================================================================
  const RW_R = 0.36, rwSlots = [0, 1, 2, 3, 4, 5].map(k => { const a = k / 6 * Math.PI * 2, x = Math.sin(a) * RW_R, z = Math.cos(a) * RW_R; return [x, 0.86, z, Math.atan2(x, z)]; });
  C.roulette = {
    cat: 'func', n: '魂盘赌局', icon: '🎡', base: 1800, grow: 1.7, fp: [0.85, 0.85],
    stat: { soul: 1 }, depth: 2, light: '#7affb0',
    desc: '绿呢赌桌中央嵌着一只转盘，六个凹槽里各坐一颗首级。空手按 E【下注】：押当前魂晶的 10%（最少 20、最多 5 万），转盘带着首级们旋转，小球停在谁的凹槽里——就赔她的魂阶：赔率 = 6 ÷ 在座首级数 × 0.9 × (1 + 0.3×魂阶)。落在空槽则庄家通吃。中奖的首级会被抛出一次 ×3 产出。',
    mount: { y: 0.86, period: 14, mult: 1.2, labelY: 1.45, slots: rwSlots },
    make() {
      const g = new THREE.Group(), U = g.userData;
      g.add(cyl(0.8, 0.72, 0.78, table, 0, 0.39, 0, 32)); g.add(cyl(0.82, 0.82, 0.04, felt, 0, 0.8, 0, 32)); g.add(cyl(0.86, 0.86, 0.03, ebony, 0, 0.775, 0, 32));
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + 0.3, c = cyl(0.04, 0.04, 0.03 + (i % 3) * 0.012, std(['#c33', '#eee', '#36a'][i % 3], { roughness: 0.4 }), Math.sin(a) * 0.62, 0.84, Math.cos(a) * 0.62, 10); g.add(c); }
      const wheel = new THREE.Group(); wheel.position.y = 0.82; g.add(wheel); U.wheel = wheel;
      wheel.add(cyl(0.56, 0.56, 0.05, ebony, 0, 0, 0, 32)); wheel.add(cyl(0.58, 0.58, 0.02, brass, 0, -0.02, 0, 32));
      for (let k = 0; k < 6; k++) { const s = rwSlots[k]; const cup = cyl(0.12, 0.09, 0.03, k % 2 ? red : M.dark, s[0], 0.03, s[2], 14); wheel.add(cup); const n = box(0.04, 0.012, 0.02, glowMat('#ffe8b0', 1.2), s[0] * 1.42, 0.028, s[2] * 1.42); n.rotation.y = s[3]; wheel.add(n); }
      wheel.add(cyl(0.07, 0.03, 0.14, brass, 0, 0.09, 0, 12)); wheel.add(cyl(0.012, 0.012, 0.08, brass, 0, 0.2, 0, 6));
      const ball = mesh(new THREE.SphereGeometry(0.022, 10, 8), std('#fff', { emissive: '#fff', emissiveIntensity: 0.6 })); ball.position.set(0, 0.06, 0.5); wheel.add(ball); U.ball = ball;
      const mk = box(0.05, 0.05, 0.05, glowMat('#ff3a3a', 2), 0, 0.92, 0.64); mk.rotation.set(0.78, 0, 0.78); g.add(mk); // 红色指针（正对玩家的一侧）
      g.add(box(0.03, 0.05, 0.03, brass, 0, 0.86, 0.64));
      return g;
    },
    cols: () => [[-0.8, 0, -0.8, 0.8, 0.85, 0.8]]
  };
  function tickRoulette(b, dt, now) {
    const U = b.g.userData, S = b._rw;
    let ang = b._ang || 0;
    if (S) {
      S.t += dt; const k = Math.min(1, S.t / S.dur), e = 1 - Math.pow(1 - k, 3); ang = S.a0 + (S.a1 - S.a0) * e;
      const bk = Math.min(1, S.t / (S.dur * 0.85)), ba = S.b0 - (S.b0 - S.b1) * (1 - Math.pow(1 - bk, 2));
      U.ball.position.set(Math.sin(ba) * (0.5 - 0.14 * bk), 0.06, Math.cos(ba) * (0.5 - 0.14 * bk));
      if (k >= 1) { b._rw = null; b._ang = ang % (Math.PI * 2); roulettePay(b, S); }
    } else { ang += dt * 0.15; b._ang = ang; U.ball.position.set(Math.sin(now * 0.6 + 1) * 0.5, 0.06, Math.cos(now * 0.6 + 1) * 0.5); }
    U.wheel.rotation.y = ang;
    for (let i = 0; i < 6; i++) { const s = rwSlots[i], x = Math.cos(ang) * s[0] + Math.sin(ang) * s[2], z = -Math.sin(ang) * s[0] + Math.cos(ang) * s[2]; reseat(b, i, { slot: [x, s[1], z, Math.atan2(x, z)] }); }
  }
  function eRoulette(b) {
    const n = heads(b).length; if (b._rw) return true; if (!n) { G.toast('🎡 空盘不转——先把首级摆进凹槽。', '#bbb', 2); return true; }
    const S = G.S; const bet = Math.max(20, Math.min(50000, Math.floor(S.coins * 0.1)));
    if (S.coins < bet || S.coins < 20) { SFX.deny && SFX.deny(); G.toast('🎡 筹码不够，庄家不收借条。', '#f88', 2); return true; }
    if (!cool(b, 'spin', 4, '🎡 转盘还没停稳')) return true;
    S.coins -= bet; const win = Math.floor(Math.random() * 6);
    // 让第 win 格的凹槽恰好停在指针（+z 方向，角度 0）处：凹槽本地角 = k/6·2π，盘转角 a 使 k/6·2π + a ≡ 0
    const cur = (b._ang || 0) % (Math.PI * 2), turns = 4 + Math.floor(Math.random() * 2), a1 = cur + Math.PI * 2 * turns + ((-(win / 6 * Math.PI * 2) - cur) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    b._rw = { t: 0, dur: 5.2, a0: cur, a1, win, bet, b0: 0, b1: -Math.PI * 2 * 7 };
    SFX.play && SFX.play('draw', 0.6, 0.7); G.toast(`🎡 下注 <b>${fmt(bet)}</b> 魂晶——转盘开始旋转……`, '#9fffc8', 2.4); return true;
  }
  function roulettePay(b, S) {
    const h = b.heads[S.win], n = heads(b).length;
    if (!h) { G.toast(`🎡 小球落进空槽——<b>庄家通吃</b>，输掉 ${fmt(S.bet)} 魂晶。`, '#ff9a9a', 3.4); SFX.deny && SFX.deny(); return; }
    const rar = h.rec.c.rar || 0, mul = 6 / n * 0.9 * (1 + 0.3 * rar), win = Math.round(S.bet * mul);
    G.addCoins(win); const v = G.trigger(h, 'manual', 3); G.burst(h.g.position, '#9fffc8', 40, 1.4, 0.9, -2); SFX.fanfare && SFX.fanfare(rar >= 3 ? 3 : 2); if (rar >= 3) G.flash && G.flash('#9fffc8');
    ft(h, `🎡 ×${mul.toFixed(2)}`, '#9fffc8', 18);
    G.toast(`🎡 落在「${h.rec.c.name}」——<b>赔率 ×${mul.toFixed(2)}</b>，赢得 ${fmt(win)} 魂晶（净 ${win - S.bet >= 0 ? '+' : ''}${fmt(win - S.bet)}）· 她再吐 ${fmt(v)}`, '#9fffc8', 4);
  }

  // =====================================================================
  // 4) 亡者琴键：一排七颗首级架在琴上，按键时她们依次「唱」一个音
  // =====================================================================
  const PX = [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9], pianoSlots = PX.map(x => [x, 0.98, -0.02, 0]);
  C.head_piano = {
    cat: 'func', n: '亡者琴键', icon: '🎹', base: 2600, grow: 1.75, fp: [1.25, 0.55],
    stat: { soul: 2 }, depth: 2, light: '#b09aff',
    desc: '一架黑漆立式钢琴，琴盖上并排架着七颗首级。空手按 E【奏乐】（冷却 6 秒）：从左到右逐个弹她们，每个音一次 ×1.2 产出。<b>魂阶从左到右不递减且至少 4 颗 = 上行音阶</b>：每下 ×2.2，并给她们 30 秒「共鸣」（产出翻倍）；七颗同一种族 = 合唱，每下 +50%。最好的旋律，是排好座次。',
    mount: { y: 0.98, period: 16, mult: 1.15, labelY: 1.55, slots: pianoSlots },
    make() {
      const g = new THREE.Group(), U = g.userData;
      g.add(box(2.46, 0.78, 0.56, ebony, 0, 0.39, -0.02)); g.add(box(2.5, 0.06, 0.6, ebony, 0, 0.8, -0.02)); g.add(box(2.46, 0.06, 0.5, M.dark, 0, 0.45, 0.42)); // 琴箱 + 台面 + 琴键托
      g.add(box(2.36, 0.12, 0.06, ebony, 0, 0.68, 0.3));
      U.keys = []; for (let i = 0; i < 16; i++) { const x = -1.05 + i * 0.14; const k = box(0.125, 0.04, 0.36, ivory, x, 0.72, 0.5); const pv = new THREE.Group(); pv.position.set(x, 0.72, 0.34); k.position.set(0, 0, 0.16); pv.add(k); g.add(pv); U.keys.push(pv); if ([0, 1, 3, 4, 5, 7, 8, 10, 11, 12, 14].includes(i)) g.add(box(0.07, 0.04, 0.2, ebony, x + 0.07, 0.75, 0.42)); }
      g.add(box(0.06, 0.78, 0.06, ebony, -1.16, 0.39, 0.5)); g.add(box(0.06, 0.78, 0.06, ebony, 1.16, 0.39, 0.5));
      // 谱架 + 三根踏板 + 两盏小烛台
      g.add(box(0.7, 0.28, 0.02, ivory, 0, 1.06, -0.22)); g.add(box(0.72, 0.03, 0.05, brass, 0, 0.93, -0.2));
      for (const x of [-0.06, 0, 0.06]) g.add(box(0.03, 0.02, 0.12, brass, x, 0.05, 0.4));
      for (const s of [-1, 1]) { g.add(cyl(0.02, 0.03, 0.22, brass, s * 1.15, 0.94, -0.12, 8)); g.add(cyl(0.03, 0.03, 0.1, ivory, s * 1.15, 1.1, -0.12, 8)); const f = BC.flame(s * 1.15, 1.15, -0.12, 0.45, '#ffb36a'); if (f) g.add(f); }
      return g;
    },
    cols: () => [[-1.25, 0, -0.3, 1.25, 0.85, 0.72]]
  };
  function ePiano(b) {
    const hs = b.heads; const cnt = heads(b).length; if (!cnt) { G.toast('🎹 琴键上空空荡荡——需要首级当音符。', '#bbb', 2); return true; }
    if (!cool(b, 'play', 6, '🎹 余音未绝')) return true;
    const seq = []; hs.forEach((h, i) => { if (h) seq.push(i); });
    let asc = seq.length >= 4; for (let j = 1; j < seq.length; j++) if ((hs[seq[j]].rec.c.rar || 0) < (hs[seq[j - 1]].rec.c.rar || 0)) asc = false;
    const same = seq.length === 7 && new Set(seq.map(i => hs[i].rec.c.race)).size === 1, now = G.clock.elapsedTime;
    const mul = 1.2 * (asc ? 2.2 : 1) * (same ? 1.5 : 1); let tot = 0; b._keyT = now;
    seq.forEach((i, j) => later(j * 170, () => {
      const h = hs[i]; if (!alive(h) || h.mount !== b) return; b._press = b._press || []; b._press[i] = 1;
      const v = G.trigger(h, 'manual', mul); tot += v; SFX.soul && SFX.soul(i, h.rec.c.rar || 0);
      G.burst(h.g.position, asc ? '#ffd84a' : '#b09aff', 8, 0.8, 0.6, -1); ft(h, '♪', asc ? '#ffe98a' : '#d8ccff', 18);
      if (asc) h.buff = Math.max(h.buff || 0, now + 30);
      if (j === seq.length - 1) later(200, () => G.toast(asc ? `🎹 <b>上行音阶</b>！七魂共鸣 30 秒 · ×${mul.toFixed(1)} 合计 +${fmt(tot)} 魂晶` : `🎹 一曲终了 · 合计 +${fmt(tot)} 魂晶${seq.length >= 4 ? ' · 试试把魂阶从低到高排' : ''}`, asc ? '#ffe98a' : '#d8ccff', 3.2));
    }));
    if (asc) { SFX.fanfare && SFX.fanfare(2); G.flash && G.flash('#b09aff'); }
    return true;
  }
  function tickPiano(b, dt, now) {
    const U = b.g.userData; b._press = b._press || [];
    for (let i = 0; i < 7; i++) { const p = b._press[i] || 0; b._press[i] = Math.max(0, p - dt * 4); const kk = U.keys[i * 2]; if (kk) kk.rotation.x = p * 0.14; }
    for (let i = 0; i < 7; i++) reseat(b, i, { dy: -0.02 * (b._press[i] || 0) });
  }

  // =====================================================================
  // 5) 结义坛：三颗首级围着一炉香——有缘的结拜，没缘的香都点不着
  // =====================================================================
  const sw = [0, 1, 2].map(k => { const a = k / 3 * Math.PI * 2 + Math.PI, x = Math.sin(a) * 0.5, z = Math.cos(a) * 0.5; return [x, 0.82, z, Math.atan2(-x, -z)]; });
  C.sworn = {
    cat: 'func', n: '结义坛', icon: '🥢', base: 2200, grow: 1.7, fp: [0.85, 0.85],
    stat: { con: 2, soul: 1 }, depth: 2, light: '#ff9a6a',
    desc: '红布供桌，中央一炉香、三只酒碗，三颗首级围坐成三角。结义只讲缘分：两两之间<b>同种族 +1、同信仰 +1、同地点 +1、共有一个性格 +1</b>（三对共最多 12 点）。空手按 E【焚香结义】（冷却 25 秒）：三颗各一次 ×(1 + 缘分×0.5) 产出；缘分 ≥ 6 则「义结金兰」，三颗共鸣 25 秒（产出翻倍）。「不求同年同月同日生，但求同年同月同日……被斩。」',
    mount: { y: 0.82, period: 18, mult: 1.25, labelY: 1.4, slots: sw },
    make() {
      const g = new THREE.Group(), U = g.userData;
      g.add(cyl(0.78, 0.7, 0.72, table, 0, 0.36, 0, 24)); g.add(cyl(0.84, 0.84, 0.04, red, 0, 0.74, 0, 24));
      const cl = cyl(0.88, 0.88, 0.22, red, 0, 0.6, 0, 24, true); g.add(cl);
      // 香炉 + 三炷香
      g.add(cyl(0.11, 0.08, 0.1, brass, 0, 0.81, 0, 14)); for (const s of [-1, 0, 1]) g.add(cyl(0.008, 0.008, 0.26, M.dark, s * 0.03, 0.98, 0, 5));
      U.tips = [-1, 0, 1].map(s => { const t = box(0.022, 0.022, 0.022, glowMat('#ff5a2a', 2.5), s * 0.03, 1.12, 0); g.add(t); return t; });
      // 三只酒碗 + 红烛
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.1, x = Math.sin(a) * 0.26, z = Math.cos(a) * 0.26; g.add(cyl(0.05, 0.03, 0.04, F('brass_goblets') ? M.dark : brass, x, 0.79, z, 12)); }
      for (const s of [-1, 1]) { g.add(cyl(0.03, 0.03, 0.2, red, s * 0.68, 0.86, 0, 8)); const f = BC.flame(s * 0.68, 0.98, 0, 0.45, '#ffb36a'); if (f) g.add(f); }
      return g;
    },
    cols: () => [[-0.85, 0, -0.85, 0.85, 0.8, 0.85]]
  };
  function swornScore(b) {
    const hs = heads(b); if (hs.length < 2) return { sc: 0, pairs: [] }; let sc = 0; const pairs = [];
    for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
      const a = hs[i].rec.c, c = hs[j].rec.c; let p = 0, why = [];
      if (a.race && a.race === c.race) { p++; why.push('同族'); }
      if (a.belief && a.belief === c.belief) { p++; why.push('同信仰'); }
      if (a.loc && a.loc === c.loc) { p++; why.push('同乡'); }
      if ((a.traits || []).some(t => (c.traits || []).includes(t))) { p++; why.push('同性情'); }
      sc += p; pairs.push([a.name, c.name, p, why]);
    }
    return { sc, pairs };
  }
  function eSworn(b) {
    const hs = heads(b); if (hs.length < 2) { G.toast('🥢 结义至少要两个人——把首级摆上三角。', '#bbb', 2); return true; }
    if (!cool(b, 'vow', 25, '🥢 香还没燃尽')) return true;
    const { sc, pairs } = swornScore(b), mul = 1 + sc * 0.5, gold = sc >= 6, now = G.clock.elapsedTime; let tot = 0;
    hs.forEach((h, i) => later(i * 260, () => { if (!alive(h)) return; const v = G.trigger(h, 'manual', mul); tot += v; G.burst(h.g.position, gold ? '#ffd84a' : '#ff9a6a', 12, 0.9, 0.6, -1); SFX.soul && SFX.soul(i * 2, h.rec.c.rar || 0); if (gold) h.buff = Math.max(h.buff || 0, now + 25); }));
    const best = pairs.slice().sort((a, c) => c[2] - a[2])[0];
    later(hs.length * 260 + 150, () => G.toast(gold ? `🥢 <b>义结金兰</b>（缘分 ${sc}）· 三魂共鸣 25 秒 · ×${mul.toFixed(1)} 合计 +${fmt(tot)}` : sc === 0 ? `🥢 毫无缘分，三炷香全都折了。 合计 +${fmt(tot)}` : `🥢 缘分 ${sc}${best ? `（${best[0]}与${best[1]}：${best[3].join('、') || '无'}）` : ''} · ×${mul.toFixed(1)} 合计 +${fmt(tot)}`, '#ffcf9a', 4));
    if (gold) { SFX.fanfare && SFX.fanfare(3); G.flash && G.flash('#ffd84a'); } else SFX.play && SFX.play('wood', 0.5, 0.9);
    return true;
  }
  function tickSworn(b, dt, now) { const U = b.g.userData, n = heads(b).length; U.tips.forEach((t, i) => { t.visible = n > 0 && (Math.sin(now * 3 + i * 2.1) > -0.8); }); for (let i = 0; i < 3; i++) reseat(b, i, {}); }

  // =====================================================================
  // 6) 落槌拍卖台：聚光灯下的天鹅绒台座，出价每秒往上爬；想落槌就按 E
  // =====================================================================
  C.auction = {
    cat: 'func', n: '落槌拍卖台', icon: '🔨', base: 3200, grow: 1.75, fp: [0.7, 0.7],
    stat: { ter: 1, soul: 1 }, depth: 3, light: '#ffe9b0',
    desc: '天鹅绒台座上的首级是今晚的压轴拍品，台下的竞买人一直在举牌。<b>出价随时间上涨</b>（约 150 秒封顶，上限 = 她单次产出的 15 倍；首级魂阶越高、展厅里首级越多，竞买人越多涨得越快）。空手按 E【落槌】：拿走当前成交价，并让她再产出一次 ×1；拍完后价格从头开始。',
    mount: { y: 1.02, period: 20, mult: 1.1, labelY: 1.6, slots: [[0, 1.02, 0, 0]] },
    make() {
      const g = new THREE.Group(), U = g.userData;
      g.add(cyl(0.5, 0.56, 0.08, M.dark, 0, 0.04, 0, 24)); g.add(cyl(0.22, 0.3, 0.86, velvet, 0, 0.48, 0, 20)); g.add(cyl(0.36, 0.36, 0.05, brass, 0, 0.93, 0, 24)); g.add(cyl(0.28, 0.28, 0.05, velvet, 0, 0.97, 0, 24));
      for (let i = 0; i < 4; i++) g.add(cyl(0.012, 0.012, 0.9, brass, Math.sin(i * 1.57) * 0.33, 0.5, Math.cos(i * 1.57) * 0.33, 6));
      // 落槌：小木墩 + 木槌（带摆臂）
      g.add(cyl(0.09, 0.09, 0.05, M.wood, 0.62, 0.72, 0.1, 14)); g.add(box(0.22, 0.26, 0.3, M.wood, 0.62, 0.36, 0.1));
      const ham = new THREE.Group(); ham.position.set(0.62, 0.92, 0.1); ham.add(cyl(0.012, 0.012, 0.26, M.wood, 0, 0.13, 0, 6)); const hd = cyl(0.04, 0.04, 0.12, M.wood, 0, 0.26, 0, 10); hd.rotation.z = Math.PI / 2; ham.add(hd); ham.rotation.z = -0.9; g.add(ham); U.ham = ham;
      // 叫价牌：一块黑板 + 三根举牌竿（牌面朝首级）
      for (let i = 0; i < 3; i++) { const a = -0.9 + i * 0.9, x = Math.sin(a) * 0.85, z = -Math.cos(a) * 0.85 + 0.05; const pole = cyl(0.01, 0.01, 0.9, brass, x, 0.45, z, 6); g.add(pole); const pd = cyl(0.11, 0.11, 0.01, i % 2 ? red : ivory, x, 0.96 + i * 0.02, z, 14); pd.rotation.x = Math.PI / 2; pd.rotation.y = a * 0.6; g.add(pd); U.paddles = (U.paddles || []).concat(pd); }
      const sp = new THREE.SpotLight('#fff0c0', 0, 4, 0.5, 0.6, 1); sp.position.set(0, 2.4, 0.5); sp.target.position.set(0, 1, 0); g.add(sp, sp.target); U.spot = sp;
      return g;
    },
    cols: () => [[-0.5, 0, -0.5, 0.5, 1.0, 0.5]]
  };
  const bidCap = h => Math.max(10, h.yield * 15), bidRate = b => { const h = b.heads[0], n = Math.min(14, 2 + Math.floor(((window.G && G.heads) ? G.heads.length : 0) / 6)); return h ? h.yield * 0.1 * (0.7 + n * 0.06) * (1 + (h.rec.c.rar || 0) * 0.25) : 0; };
  function tickAuction(b, dt, now) {
    const U = b.g.userData, h = b.heads[0];
    if (h) { b._bid = Math.min(bidCap(h), (b._bid || 0) + bidRate(b) * dt); const pct = b._bid / bidCap(h); U.spot.intensity = 0.8 + pct * 1.4; U.paddles.forEach((p, i) => { p.position.y = 0.96 + i * 0.02 + Math.max(0, Math.sin(now * (1.3 + i * 0.4) + i * 2) * 0.05) * (0.3 + pct); });
      if (!b._bn || now > b._bn) { b._bn = now + 12 + Math.random() * 6; if (b._bid > 10) ft(h, `🔨 ${fmt(b._bid)}`, '#ffe9b0', 13); }
    } else { b._bid = 0; U.spot.intensity = 0; }
    b._hm = Math.max(0, (b._hm || 0) - dt * 3); U.ham.rotation.z = -0.9 + b._hm * 0.9 - 0.0; if (h) reseat(b, 0, {});
  }
  function eAuction(b) {
    const h = b.heads[0]; if (!h) { G.toast('🔨 台上没有拍品——把一颗首级摆上天鹅绒台座。', '#bbb', 2); return true; }
    const bid = Math.round(b._bid || 0); if (bid < 5) { G.toast('🔨 台下还没人举牌，再等等。', '#bbb', 1.8); return true; }
    b._bid = 0; b._hm = 1; G.addCoins(bid); const v = G.trigger(h, 'manual', 1);
    SFX.play && SFX.play('heavy', 0.7, 1.3); SFX.fanfare && SFX.fanfare(bid > h.yield * 9 ? 3 : 1); G.burst(h.g.position, '#ffe9b0', 24, 1.1, 0.8, -1);
    G.toast(`🔨 <b>成交！</b>「${h.rec.c.name}」以 ${fmt(bid)} 魂晶落槌 · 另产出 ${fmt(v)}`, '#ffe9b0', 3.6); return true;
  }

  // ---------------------------------------------------------------------
  function tick(dt, now) {
    for (const b of G.builds) {
      try { switch (b.type) {
        case 'cuckoo': tickCuckoo(b, dt, now); break; case 'vending': tickVend(b, dt, now); break; case 'roulette': tickRoulette(b, dt, now); break;
        case 'head_piano': tickPiano(b, dt, now); break; case 'sworn': tickSworn(b, dt, now); break; case 'auction': tickAuction(b, dt, now); break;
      } } catch (e) { if (!tick._w) { tick._w = 1; console.warn('curios.tick', b.type, e); } }
    }
  }
  function onE(hit, held, pickup) {
    const b = hit && hit.build; if (!b || pickup) return false;
    if (held) return false;
    switch (b.type) {
      case 'cuckoo': return eCuckoo(b); case 'vending': return eVend(b); case 'roulette': return eRoulette(b);
      case 'head_piano': return ePiano(b); case 'sworn': return eSworn(b); case 'auction': return eAuction(b);
    }
    return false;
  }
  function onTip(hit, held) {
    const b = hit && hit.build; if (!b || !C[b.type] || held) return null;
    const hs = heads(b), n = b.heads ? b.heads.length : 0, cnt = `（${hs.length}/${n}）`;
    switch (b.type) {
      case 'cuckoo': return `<b>🕰️ 布谷钟</b>${cnt} · 下次报时 ${Math.max(0, Math.ceil(C.cuckoo.mount.period - (b.timer || 0)))} 秒 · <b>[E]</b> 拨针催促 · 整点连敲`;
      case 'vending': return `<b>🥤 魂饮自动贩卖机</b>${cnt} · 出货口 ${(b._stock || []).length}/8 · <b>[E]</b> ${(b._stock || []).length ? '取货' : '投币 60 魂晶买药'}`;
      case 'roulette': return `<b>🎡 魂盘赌局</b>${cnt} · <b>[E]</b> 下注 ${fmt(Math.max(20, Math.min(50000, Math.floor((G.S.coins || 0) * 0.1))))} 魂晶${hs.length ? `（每格赔率 ×${(6 / hs.length * 0.9).toFixed(2)} 起）` : ''}`;
      case 'head_piano': { let asc = hs.length >= 4; for (let j = 1; j < hs.length; j++) if (hs[j].rec.c.rar < hs[j - 1].rec.c.rar) asc = false; return `<b>🎹 亡者琴键</b>${cnt} · ${asc ? '✨ 当前是上行音阶' : hs.length >= 4 ? '魂阶从左到右不递减 = 上行音阶' : '至少 4 颗才能成音阶'} · <b>[E]</b> 奏乐`; }
      case 'sworn': { const s = swornScore(b); return `<b>🥢 结义坛</b>${cnt} · 缘分 ${s.sc}${s.sc >= 6 ? '（义结金兰）' : '（≥6 金兰）'} · <b>[E]</b> 焚香结义`; }
      case 'auction': { const h = b.heads[0]; return h ? `<b>🔨 落槌拍卖台</b> · 当前出价 <b>${fmt(b._bid || 0)}</b> / ${fmt(bidCap(h))} · <b>[E]</b> 落槌成交` : '<b>🔨 落槌拍卖台</b> · 手持首级按 E 摆上拍品台'; }
    }
    return null;
  }

  // 解锁条件
  (function unlocks() {
    if (!window.Unlocks || !Unlocks.R) return; const R = Unlocks.R;
    const H = S => S.heads.length, E = S => (S.stats && S.stats.earned) || 0, T = S => (S.stats && S.stats.trips) || 0, maxRar = S => S.heads.reduce((m, r) => Math.max(m, r.c.rar), -1);
    R.cuckoo = [S => H(S) >= 3 && T(S) >= 2, '地精斯尼克从废墟里拖出一座停摆的大钟：「里头有个空位，大小……刚好。」'];
    R.vending = [S => T(S) >= 3, '你在一处废墟里找到一台还亮着灯的铁皮机器。它吐出一张纸条：「请投币。」'];
    R.roulette = [S => S.depth >= 2 && H(S) >= 6 && E(S) >= 3000, '地精们在洞角偷偷玩一种叫「转盘」的游戏。斯尼克朝你挤眼：「您赌吗？」'];
    R.head_piano = [S => S.depth >= 2 && H(S) >= 7 && maxRar(S) >= 1, '一架被烧黑的钢琴躺在野外。七个琴键，七个位置——你数了数自己的收藏，刚好。'];
    R.sworn = [S => S.depth >= 2 && H(S) >= 4, '一幅褪色的「桃园」年画从战场上捡回。画里三个人，画外三个位置。'];
    R.auction = [S => S.depth >= 3 && H(S) >= 10 && E(S) >= 12000, '一位戴面具的拍卖师递来名片：「您手里的东西，值得一个像样的价钱。」'];
  })();

  const wait = setInterval(() => {
    if (!window.G || !G.HOOK) return; clearInterval(wait);
    G.HOOK.frame.push(tick); G.HOOK.e.push(onE); G.HOOK.tip.push(onTip);
    if (window.Unlocks && Unlocks.scan && G.S) try { Unlocks.scan(true); } catch (e) { }
  }, 150);
  return { _dbg: { swornScore, eVend, eRoulette, ePiano, eSworn, eAuction, eCuckoo, tickRoulette, tick } };
})();
