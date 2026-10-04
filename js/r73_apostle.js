// R73 MOD apostle73（默认开）：章节 BOSS「月之使徒」的布局——每位使徒在本章的两个地区里干一件不一样的事，你没破坏的部分会在 BOSS 战里变成她的阶段/帮手。
//  用户：「祭坛刷 2 个只是 BOSS 的一种」「BOSS 各有特色」「章节开始有电影」「地图上有影响」。
//  11 种机制（按使徒模板 id）：
//   nun 血月祭坛（找到 → 站稳 3 秒摧毁；祭坛旁敌人回血）→ BOSS：血月护盾阶段（无敌回血，砍碎两颗血珠才破）
//   countess 蜡封宾客（3 名被蜡封的敌人：砍头带走才算解封，尸体留着会化成蜡）→ BOSS：蜡像替身
//   huntress 狼月围猎（狼嚎后 3 名猎犬围猎你，55 秒内全灭）→ BOSS：召唤猎犬 + 猎物标记
//   lady 雾纱宾客（她往最远的门逃，追上放倒她；雾更浓）→ BOSS：雾影分身 + 幽影
//   inquisitor 罪状（本章每次斩首 = 罪状 +1；烧掉地区里的罪状板 = 罪状减半）→ BOSS：审判光柱（罪状越多越密）
//   foxmiko 双月铃（天上多出一个假月亮；两只铃 12 秒内都敲响才驱散）→ BOSS：月影瞬身 + 残影爆炸 + 回血
//   fallen 燃羽（燃烧的羽毛从天而降，落地后 16 秒内捡起，凑够 3 根；燃羽给附近敌人回血）→ BOSS：飞天阶段（羽雨）
//   merc 工头的契约（45 秒内、不喝药，打倒来挑战的工头）→ BOSS：工头加入战斗
//   singer 共鸣石（记住三块石头亮起的顺序再按顺序敲；没解开前声波一圈圈扩散）→ BOSS：节拍声波
//   shepherd 起尸（没被斩首的尸体 25 秒后爬起来）→ BOSS：爬起来的那些人从坟里回来
//   alchemist 魂水塔（每 8 秒吸走你这一趟 3% 魂晶；砍 6 下砸碎）→ BOSS：喝药强化
//  另：章节开场电影（第一趟进图时：使徒名牌 + 她的布局 + 赌注）、BOSS 入场电影（总结你破坏了多少）、地图雾色随使徒变化。
window.Apostle73 = (() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('apostle73') !== false;
  const LP = () => (window.Loop && Loop.on && Loop.on() ? Loop : null);
  const Wd = () => (window.Worlds && Worlds.active ? Worlds._W : null);
  const now = () => performance.now() / 1000;
  const T = () => window.THREE;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (t, c, s) => { try { G.toast(t, c || '#e8d0ff', s || 2.6); } catch (e) { } };
  const sfx = (k, v, p) => { try { SFX.play && SFX.play(k, v, p); } catch (e) { } };
  const ndOf = W => W && W.graph && W.graph.nodes[W.cur];
  const fieldOK = W => { const nd = ndOf(W); return !!(W && W.B && !W.busy && !W.dead && nd && !nd.home && !nd.arena && !nd.eliteArena && !nd.huntArena && !W.B.corr && !(W.graph && W.graph.arena)); };
  const dodging = () => { const W = Wd(); return !!(W && W.dodgeT > now()); };
  const strong = fo => !!(window.Foe && Foe.STRONG && Foe.STRONG(fo));
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ---------------- 本章状态（存在 Loop 的 run 里，换章自动重置）----------------
  function A() { const L = LP(); if (!L) return null; const r = L.R(); if (!r.a73 || r.a73.ch !== r.chap) r.a73 = { ch: r.chap, res: [], v: { crime: 0, risen: 0 }, cine: 0, bcine: 0 }; return r.a73; }
  const B_ = () => { const L = LP(); return L ? L.CB() : null; };
  const SC = () => { const B = B_(); return B ? SCH[B.id] || null : null; };
  const fails = () => { const a = A(); return a ? a.res.filter(x => x === 'fail').length : 0; };
  const wins = () => { const a = A(); return a ? a.res.filter(x => x === 'win').length : 0; };

  // ---------------- 小工具：落点 / 道具 / 特效 ----------------
  function spot(W, dMin, dMax, avoid) {
    const B = W.B, P = W.pos; let best = null, bs = -1;
    for (let i = 0; i < 48; i++) {
      const a = Math.random() * 6.2832, d = dMin + Math.random() * (dMax - dMin), x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d; let sc = Math.random() * 3;
      if (B.edge) { const E = B.edge(x, z); if (!E || E[0] < 3.2) continue; sc += Math.min(6, E[0]); } else if (Math.hypot(x, z) > (B.R || 30) - 3.5) continue;
      if ((B.cols || []).some(c => Math.hypot(c.x - x, c.z - z) < (c.r || 0.5) + 1.3)) continue;
      if ((B.doors || []).some(dr => Math.hypot(dr.x - x, dr.z - z) < 5)) continue;
      if (avoid && avoid.some(p => Math.hypot(p.x - x, p.z - z) < p.r)) continue;
      if (sc > bs) { bs = sc; best = { x, z }; }
    }
    if (!best) { const v = new (T().Vector3)(P.x + 5, 0, P.z + 3); if (B.lp && B.lp.clamp) B.lp.clamp(v, 2); best = { x: v.x, z: v.z }; }
    best.y = B.H(best.x, best.z); return best;
  }
  function prop(name, o) { try { if (window.Assets && Assets.has(name)) return Assets.fit(name, o || {}); } catch (e) { } return null; }
  let GEO = null;
  function geo() { if (GEO) return GEO; const t = T(); GEO = { disc: new t.CircleGeometry(1, 40).rotateX(-Math.PI / 2), ring: new t.RingGeometry(0.86, 1, 64).rotateX(-Math.PI / 2), torus: new t.TorusGeometry(1, 0.05, 6, 40) }; return GEO; }
  const addM = (col, op) => new (T().MeshBasicMaterial)({ color: col, transparent: true, opacity: op, depthWrite: false, blending: T().AdditiveBlending, side: T().DoubleSide, fog: false });
  let glowTex = null;
  function glowT() { if (glowTex) return glowTex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.4)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return (glowTex = new (T().CanvasTexture)(c)); }
  function glow(col, s) { const sp = new (T().Sprite)(new (T().SpriteMaterial)({ map: glowT(), color: col, blending: T().AdditiveBlending, depthWrite: false, transparent: true, fog: false })); sp.scale.setScalar(s || 1); sp.raycast = () => { }; return sp; }
  function disc(sc, x, y, z, r, col, op) { const m = new (T().Mesh)(geo().disc, addM(col, op)); m.position.set(x, y + 0.07, z); m.scale.setScalar(r); m.renderOrder = 4; sc.add(m); return m; }
  function ringM(sc, x, y, z, r, col, op) { const m = new (T().Mesh)(geo().ring, addM(col, op)); m.position.set(x, y + 0.08, z); m.scale.setScalar(r); m.renderOrder = 4; sc.add(m); return m; }
  function drop(o) { if (!o) return; if (o.parent) o.parent.remove(o); o.traverse && o.traverse(m => { if (m.material && !m.material.map) { try { m.material.dispose(); } catch (e) { } } }); }
  function hazard(name, x, z) { return { pos: new (T().Vector3)(x, 0, z), h: { c: { name, rar: 2 } }, rar: 2, tier: 1, dmgMul: 1, boss: null, broken: 0, stag: 0, hp: 1, maxHp: 1, hazard: 1 }; }
  function hurt(name, x, z, k, opt) { const C = window.Foe && Foe.ctx && Foe.ctx(), W = Wd(); if (!C || !W || dodging()) return false; const st = G.st(); try { C.hitPlayer(hazard(name, x, z), Math.max(2, Math.round(st.maxHp * k)), Object.assign({ ang: 0, thrust: true, unblock: true }, opt || {})); } catch (e) { return false; } return true; }
  function spark(x, y, z, n, col) { try { Foe.spark({ x, y, z }, n || 16, col); } catch (e) { } }
  async function spawnFoe(h, x, z, set) {
    const C = window.Foe && Foe.ctx && Foe.ctx(), W = Wd(); if (!C || !W || !W.B || C.sc !== W.B.sc) return null;
    const pos = new (T().Vector3)(x, 0, z); if (W.B.lp && W.B.lp.clamp) W.B.lp.clamp(pos, 1.5);
    let out = null; try { out = await Foe.populate(C, [{ h, pos }], { keep: true }); } catch (e) { console.warn('a73 spawn', e); return null; }
    const fo = out && out[0]; if (!fo) return null; if (Wd() !== W) return null;
    fo.seen = true; fo.state = 'chase'; fo.brave = true; fo._liv = 1; if (!W.foes) W.foes = Foe.foes; else if (!W.foes.includes(fo)) W.foes.push(fo);
    if (set) try { set(fo); } catch (e) { } return fo;
  }
  function newH(name, title, rar) { const W = Wd(), nd = ndOf(W); if (!nd || !window.RPG) return null; let h = null; try { h = RPG.foe(G.S, nd.loc, (Math.random() * 4294967296) >>> 0, G.usedNames, G.usedSig); } catch (e) { return null; } if (!h) return null; if (name) h.c.name = name + (h.c.name ? '·' + h.c.name : ''); if (title) h.c.title = title; if (rar != null) h.c.rar = rar; return h; }
  function vanish(fo) { if (!fo || fo.dead) return; fo.noNem73 = 1; fo.dead = true; fo.escaped = true; fo.rag = null; try { if (fo.warn) fo.warn.visible = false; if (fo.f && fo.f.root && fo.f.root.parent) fo.f.root.parent.remove(fo.f.root); Foe.say(fo, ''); } catch (e) { } const W = Wd(); if (W && W.foes) { const i = W.foes.indexOf(fo); if (i >= 0) W.foes.splice(i, 1); } const j = Foe.foes.indexOf(fo); if (j >= 0) Foe.foes.splice(j, 1); }
  const foesNear = (p, r) => (window.Foe && Foe.foes || []).filter(f => !f.dead && Math.hypot(f.pos.x - p.x, f.pos.z - p.z) < r);

  // ---------------- 交互（worlds.js 的 kind:'use'）+ 读条 ----------------
  function use(I, p, label, fn, r) { const W = Wd(); if (!W || !W.B) return null; const it = { kind: 'use', x: p.x, z: p.z, label, use: () => fn(it) }; W.B.inter.push(it); I.inter.push(it); if (r) { const c = { x: p.x, z: p.z, r }; W.B.cols.push(c); I.cols.push(c); } return it; }
  let CH = null, chEl = null;
  function channel(label, need, p, done) { const W = Wd(); if (!W) return; if (CH) return; CH = { label, need, t: 0, p, hp0: G.S.hp, done }; sfx('draw', 0.4, 0.5); }
  function chUI(show, k, label) {
    if (!chEl) { chEl = document.createElement('div'); chEl.id = 'a73ch'; chEl.style.cssText = 'position:fixed;left:50%;top:62%;transform:translateX(-50%);z-index:31;pointer-events:none;font:600 14px/1.4 inherit;color:#ffe8e0;text-shadow:0 1px 3px #000;text-align:center;display:none'; chEl.innerHTML = '<div class="l"></div><div style="width:220px;height:6px;margin-top:4px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.25)"><i style="display:block;height:100%;width:0;background:linear-gradient(90deg,#ff6a4a,#ffd080)"></i></div>'; document.body.appendChild(chEl); chEl._l = chEl.querySelector('.l'); chEl._i = chEl.querySelector('i'); }
    chEl.style.display = show ? 'block' : 'none'; if (!show) return; if (chEl._l._t !== label) { chEl._l._t = label; chEl._l.textContent = label; } chEl._i.style.width = (k * 100).toFixed(1) + '%';
  }
  function chTick(dt) {
    if (!CH) { if (chEl && chEl.style.display !== 'none') chUI(false); return; }
    const W = Wd(); if (!W) { CH = null; chUI(false); return; }
    const d = Math.hypot(W.pos.x - CH.p.x, W.pos.z - CH.p.z);
    if (d > 2.8 || G.S.hp < CH.hp0 - 0.5) { toast(d > 2.8 ? '✋ 离开了——读条中断' : '💢 被打断了！先清掉身边的敌人', '#ffb0a0', 1.4); CH = null; chUI(false); return; }
    CH.t += dt; chUI(true, Math.min(1, CH.t / CH.need), `⛧ ${CH.label}…… ${Math.max(0, CH.need - CH.t).toFixed(1)}s`);
    if (CH.t >= CH.need) { const f = CH.done; CH = null; chUI(false); try { f(); } catch (e) { console.warn('a73 ch', e); } }
  }

  // ---------------- 地图气氛（雾色 / 第二个月亮）----------------
  let mood = null;
  function setMood(W, col, k, moon) {
    clearMood(); if (!W || !W.B || !W.B.sc) return; const sc = W.B.sc; mood = { sc, objs: [] };
    try { R73.fog(sc, 'apo', col, 0.35, k || 1); } catch (e) { }
    if (moon) { const P = W.pos, m = glow(moon, 46); m.position.set(P.x + 150, 120, P.z - 170); m.renderOrder = -1; sc.add(m); const m2 = glow('#ffffff', 18); m.add(m2); m2.scale.setScalar(0.4); mood.objs.push(m); mood.moon = m; }
  }
  function clearMood() { if (!mood) return; try { R73.fogClear(mood.sc, 'apo'); } catch (e) { } for (const o of mood.objs) drop(o); mood = null; }

  // ---------------- 每趟的实例 ----------------
  let I = null; // { k, trip, B, st:'live'|'win'|'fail', objs:[], inter:[], cols:[], d:{} }
  function cleanObjs() { if (!I) return; const W = Wd(); for (const o of I.objs) drop(o); I.objs = []; if (W && W.B) { for (const it of I.inter) { it.done = true; const i = W.B.inter.indexOf(it); if (i >= 0) W.B.inter.splice(i, 1); } for (const c of I.cols) { const i = W.B.cols.indexOf(c); if (i >= 0) W.B.cols.splice(i, 1); } } I.inter = []; I.cols = []; clearMood(); }
  function finish(st, msg, col) {
    if (!I || I.st !== 'live') return; I.st = st; const a = A(); if (a && a.res.length < 2) a.res.push(st); const S = SC();
    cleanObjs(); toast(msg || (st === 'win' ? `✦ 你破坏了使徒的布局（${wins()}/2）` : `✧ 使徒的布局得逞了（BOSS 战会更难）`), col || (st === 'win' ? '#ffe28a' : '#ff9a8a'), 4);
    if (st === 'win') sfx('bell', 0.6, 1.4);
    try { window.M73 && M73.bump && M73.bump(st === 'win' ? -6 : 8, st === 'win' ? `破坏了「${S ? S.obj : '布局'}」` : `「${S ? S.obj : '布局'}」得逞`); } catch (e) { }
    try { G.save && G.save(); } catch (e) { }
  }
  const win = (msg) => finish('win', msg), fail = (msg) => finish('fail', msg);

  // ================= 11 套布局 =================
  const SCH = {
    nun: { obj: '血月祭坛', ic: '🩸', col: '#ff4050', fog: '#5a0a14', story: '她在两个地区的空地上搭起了血月祭坛，把收来的头摆成一圈。祭坛亮着的时候，附近的人伤口会自己合上。', goal: '找到这片地区的血月祭坛，靠近按 E、站稳 3 秒摧毁它（附近的敌人会一直回血）', boss: '每座没摧毁的祭坛 = BOSS 战多一次「血月护盾」：她无敌并回血，砍碎场上两颗血珠才破',
      make(I, W) { const p = spot(W, 14, 30); I.d.p = p; const g = new (T().Group)(); g.position.set(p.x, p.y, p.z); const pit = prop('stone_fire_pit', { h: 0.55 }); if (pit) g.add(pit); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283, hd = prop('bull_head', { h: 0.32, ry: a + Math.PI }); if (hd) { hd.position.set(Math.sin(a) * 1.15, 0, Math.cos(a) * 1.15); g.add(hd); } } try { const fl = Assets.flame(0, 0.45, 0, 2.6, '#ff2040'); if (fl) g.add(fl); } catch (e) { } const gl = glow('#ff2a40', 3.2); gl.position.y = 1.1; g.add(gl); I.d.gl = gl; W.B.sc.add(g); I.objs.push(g); I.d.ring = ringM(W.B.sc, p.x, p.y, p.z, 14, '#ff2040', 0.12); I.objs.push(I.d.ring);
        use(I, p, '摧毁血月祭坛（站稳 3 秒）', () => channel('摧毁血月祭坛', 3, p, () => { spark(p.x, p.y + 0.8, p.z, 40); try { W.shake = 0.4; } catch (e) { } win('🩸 血月祭坛碎了——修女少了一层血月护盾'); }), 1.0);
        for (const fo of foesNear(p, 22)) { fo.home = new (T().Vector3)(p.x + (Math.random() - 0.5) * 6, 0, p.z + (Math.random() - 0.5) * 6); } },
      tick(I, dt, W, t) { const p = I.d.p; if (I.d.gl) I.d.gl.material.opacity = 0.6 + 0.3 * Math.sin(t * 3); if (I.d.ring) I.d.ring.material.opacity = 0.08 + 0.05 * Math.sin(t * 2); for (const fo of foesNear(p, 14)) if (fo.hp < fo.maxHp) fo.hp = Math.min(fo.maxHp, fo.hp + fo.maxHp * 0.015 * dt); },
      hud: I => '找到血月祭坛（地图上红光处）→ E 站稳 3 秒' },
    countess: { obj: '蜡封宾客', ic: '🕯️', col: '#ffd8a0', fog: '#3a2a18', story: '她给两个地区的人送去了请柬。收到请柬的人身上会慢慢长出蜡——等蜡封满，她们就会走进千烛长廊，变成她的蜡像护卫。', goal: '这里有 3 名被蜡封的人（脚下有烛光圈）：放倒她们并砍下头带走才算解封；尸体留着 20 秒会化成蜡', boss: '每次没解封 = BOSS 战里多 2 座会炸开的蜡像替身',
      make(I, W) { I.d.list = []; I.d.lost = 0; I.d.wait = now() + 2; },
      tick(I, dt, W, t) { const d = I.d; if (d.list.length < 3 && t > d.wait) { d.wait = t + 3; const cand = (W.foes || []).filter(f => !f.dead && !strong(f) && !f.wax73 && !f.nemX && !f.hunter2); for (const fo of cand.sort(() => Math.random() - 0.5)) { if (d.list.length >= 3) break; fo.wax73 = 1; const m = ringM(W.B.sc, fo.pos.x, fo.pos.y, fo.pos.z, 0.7, '#ffcf80', 0.5); I.objs.push(m); const gl = glow('#ffd080', 0.9); W.B.sc.add(gl); I.objs.push(gl); d.list.push({ fo, m, gl, dt: 0 }); } if (d.list.length && !d.told) { d.told = 1; toast(`🕯️ 这里有 ${d.list.length} 名被蜡封的人——砍头带走才算解封`, '#ffd8a0', 3); } }
        let ok = 0; for (const e of d.list) { const fo = e.fo; if (e.done) { ok += e.done === 'ok' ? 1 : 0; continue; } e.m.position.set(fo.pos.x, (W.B.H(fo.pos.x, fo.pos.z) || 0) + 0.08, fo.pos.z); e.gl.position.set(fo.pos.x, fo.pos.y + 2.1, fo.pos.z); e.m.material.opacity = 0.35 + 0.2 * Math.sin(t * 4);
          if (fo.decap) { e.done = 'ok'; ok++; e.m.visible = false; e.gl.visible = false; toast(`🕯️ 解封 ${ok}/${d.list.length}`, '#ffe8c0', 1.6); continue; }
          if (fo.dead && !fo.escaped) { e.dt += dt; if (e.dt > 20) { e.done = 'lost'; d.lost++; e.m.visible = false; e.gl.visible = false; toast('🕯️ 一具蜡封的尸体化成了蜡——她的蜡像会多一座', '#ff9a8a', 2.4); } } else if (fo.escaped) { e.done = 'lost'; d.lost++; } }
        if (d.list.length && d.list.every(e => e.done)) { if (d.lost) fail(`🕯️ 有 ${d.lost} 人化成了蜡——伯爵夫人的蜡像替身会更多`); else win('🕯️ 蜡封宾客全部解封——伯爵夫人的长廊少了一批护卫'); } },
      hud: I => { const d = I.d, n = d.list.filter(e => e.done === 'ok').length; return d.list.length ? `蜡封宾客：已解封 ${n}/${d.list.length}（放倒后砍头）` : '正在寻找蜡封的人……'; } },
    huntress: { obj: '狼月围猎', ic: '🐺', col: '#ffb060', fog: '#3a2410', story: '她把两个地区划成了猎场。狼嚎响起的时候，她的猎犬会从四面围上来——她在远处看着，记下你怎么逃。', goal: '狼嚎之后 3 名猎犬会围猎你：55 秒内把她们全部放倒（跑掉的猎犬会回到她身边）', boss: '每次没打赢围猎 = BOSS 战召唤 2 名猎犬，并且她对你的伤害 +12%',
      make(I, W) { I.d.t0 = now() + 16 + Math.random() * 10; I.d.ph = 'wait'; I.d.list = []; toast('🐺 远处传来狼嚎——这片地区是狼月猎手的猎场', '#ffc890', 3); sfx('roar', 0.3, 0.7); },
      tick(I, dt, W, t) { const d = I.d;
        if (d.ph === 'wait' && t > d.t0 && !d.sp) { d.sp = 1; sfx('roar', 0.6, 0.6); toast('🐺 围猎开始！55 秒内放倒 3 名猎犬', '#ffb060', 3); const P = W.pos; let k = 0; for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283 + Math.random(), h = newH('猎犬', '狼月猎手的猎犬', 2); if (!h) continue; spawnFoe(h, P.x + Math.sin(a) * 15, P.z + Math.cos(a) * 15, fo => { fo.hunt73 = 1; fo.spdMul = (fo.spdMul || 1) * 1.15; fo.iq = Math.max(fo.iq || 0, 1); d.list.push(fo); }).then(() => { k++; if (k >= 1 && d.ph === 'wait') { d.ph = 'hunt'; d.until = now() + 55; } }); } }
        if (d.ph === 'hunt') { if (d.list.length && d.list.every(f => f.dead)) { win('🐺 猎犬全灭——狼月猎手少了一支猎队'); return; } if (t > d.until) { for (const f of d.list) if (!f.dead) vanish(f); fail('🐺 猎犬跑回了她身边——BOSS 战她会带着猎犬'); } } },
      hud: I => { const d = I.d; if (d.ph === 'hunt') return `🐺 围猎：剩 ${d.list.filter(f => !f.dead).length} 名猎犬 · ${Math.max(0, d.until - now()).toFixed(0)} 秒`; return '🐺 猎场：狼嚎随时会响起'; } },
    lady: { obj: '雾纱宾客', ic: '👰', col: '#d8fff0', fog: '#c8d8d0', story: '她在两个地区各找到了一位「宾客」，蒙上雾纱，要她们赶在你之前逃去婚礼堂。宾客跑到哪里，雾就跟到哪里。', goal: '一位蒙着雾纱的宾客正往最远的门逃：在她出门之前放倒她（雾会越来越浓）', boss: '每位逃掉的宾客 = BOSS 战里一具雾影分身，新娘获得「幽影」',
      make(I, W) { const h = newH('雾纱宾客', '新娘的宾客', 1); if (!h) return; const P = W.pos, p = spot(W, 9, 14); I.d.p0 = p; toast('👰 一位蒙着雾纱的宾客从你面前跑开了——在她出门之前拦住她！', '#d8fff0', 3.2);
        spawnFoe(h, p.x, p.z, fo => { fo.veil73 = 1; fo.brave = false; fo.state = 'flee'; fo.maxHp = fo.hp = Math.round(fo.maxHp * 0.7); I.d.fo = fo; const ds = (W.B.doors || []).slice().sort((a, b) => Math.hypot(b.x - fo.pos.x, b.z - fo.pos.z) - Math.hypot(a.x - fo.pos.x, a.z - fo.pos.z)); I.d.door = ds[0] || null; const gl = glow('#e8fff8', 1.6); W.B.sc.add(gl); I.objs.push(gl); I.d.gl = gl; }); },
      tick(I, dt, W, t) { const d = I.d, fo = d.fo; if (!fo) return; if (d.gl) d.gl.position.set(fo.pos.x, fo.pos.y + 1.9, fo.pos.z);
        if (fo.dead && !fo.escaped) { win('👰 雾纱宾客倒下了——新娘少了一位客人'); return; } if (fo.escaped) { fail('👰 宾客逃出了门——婚礼堂里会多一具雾影'); return; }
        fo.brave = false; fo.state = 'flee'; if (mood) { try { R73.fog(W.B.sc, 'apo', SCH.lady.fog, 0.35, Math.min(2.2, 1.35 + (t - (d.t0 || (d.t0 = t))) / 50)); } catch (e) { } }
        const dr = d.door; if (dr) { const dx = dr.x - fo.pos.x, dz = dr.z - fo.pos.z, L = Math.hypot(dx, dz); if (L < 1.8) { vanish(fo); fail('👰 宾客逃出了门——婚礼堂里会多一具雾影'); return; } if (!(fo.stag > 0) && !(fo.broken > 0)) fo.rv = { x: dx / L * 2.2, z: dz / L * 2.2 }; } },
      hud: I => { const fo = I.d.fo; if (!fo) return '👰 雾纱宾客'; const dr = I.d.door; return `👰 宾客正逃往门口${dr ? ` · 离门 ${Math.hypot(dr.x - fo.pos.x, dr.z - fo.pos.z).toFixed(0)} 米` : ''} · 生命 ${Math.max(0, Math.round(fo.hp / fo.maxHp * 100))}%`; } },
    inquisitor: { obj: '罪状', ic: '📜', col: '#f0e6c8', fog: '#4a4636', story: '她在给你写卷宗。本章你每砍下一颗头，罪状上就多一条；两个地区的告示板上贴着你的画像和罪名。', goal: '本章每次斩首 = 罪状 +1。找到地区里的罪状告示板，E 站稳 2.5 秒烧掉 → 罪状减半', boss: '罪状每 6 条 + 每块没烧的告示板 = 审判光柱更密（她会在你脚下落光柱）',
      make(I, W) { const p = spot(W, 12, 26); I.d.p = p; const g = new (T().Group)(); g.position.set(p.x, p.y, p.z); const b = prop('standing_chalkboard_01', { h: 1.7 }); if (b) g.add(b); const l = prop('vintage_oil_lamp', { h: 0.4 }); if (l) { l.position.set(0.7, 0, 0.4); g.add(l); } const gl = glow('#fff0c0', 2.2); gl.position.y = 1.2; g.add(gl); W.B.sc.add(g); I.objs.push(g);
        use(I, p, '烧掉罪状告示板（站稳 2.5 秒）', () => channel('焚烧罪状', 2.5, p, () => { const a = A(); if (a) a.v.crime = Math.floor(a.v.crime / 2); spark(p.x, p.y + 1, p.z, 30); win(`📜 罪状烧掉了一半（剩 ${a ? a.v.crime : 0} 条）`); }), 0.7); },
      hud: I => { const a = A(); return `📜 罪状 ${a ? a.v.crime : 0} 条 · 找到告示板（白光处）E 烧掉`; } },
    foxmiko: { obj: '双月铃', ic: '🔔', col: '#ff8ad8', fog: '#30183a', story: '她在两个地区的天上各挂了一个假月亮。假月亮照着的地方，影子会多出一个。只有同时敲响两只神铃才能把它敲碎。', goal: '天上的第二个月亮是假的：找到两只神铃（粉光），12 秒内把两只都敲响', boss: '每个没驱散的假月亮 = BOSS 每 11 秒月影瞬身，留下会爆炸的残影，并回复生命',
      make(I, W) { const p1 = spot(W, 10, 24), p2 = spot(W, 14, 34, [{ x: p1.x, z: p1.z, r: 16 }]); I.d.ps = [p1, p2]; I.d.rung = [0, 0];
        I.d.ps.forEach((p, i) => { const g = new (T().Group)(); g.position.set(p.x, p.y, p.z); const l = prop('wooden_lantern_01', { h: 1.2 }); if (l) g.add(l); const gl = glow('#ff9ae0', 2.4); gl.position.y = 1.4; g.add(gl); W.B.sc.add(g); I.objs.push(g);
          use(I, p, '敲响神铃', () => { const t = now(); I.d.rung[i] = t; sfx('bell', 0.8, i ? 1.2 : 1.6); spark(p.x, p.y + 1.4, p.z, 18, 'blue'); const o = I.d.rung[1 - i]; if (o && t - o < 12) { win('🔔 两只神铃同时响了——假月亮碎了'); } else toast('🔔 叮——12 秒内去敲另一只！', '#ffb8e8', 2.2); }); }); },
      tick(I, dt, W, t) { if (mood && mood.moon) { mood.moon.material.opacity = 0.75 + 0.2 * Math.sin(t * 0.7); } },
      hud: I => { const r = I.d.rung, t = now(), k = Math.max(r[0], r[1]); return k && t - k < 12 ? `🔔 快！另一只神铃 · 剩 ${(12 - (t - k)).toFixed(1)} 秒` : '🔔 找到两只神铃（粉光），12 秒内都敲响'; } },
    fallen: { obj: '燃羽', ic: '🪶', col: '#b090ff', fog: '#1e1430', story: '她的翅膀还在烧。烧断的羽毛会从天上落进两个地区——落地的燃羽会把附近的人治好，捡起来的人会被烫伤，但她就飞不起来了。', goal: '燃烧的羽毛会从天而降（先出现紫圈，躲开），落地后 16 秒内靠近按 E 捡起，凑够 3 根', boss: '每次没凑齐 = BOSS 多一次飞天阶段：她飞在空中无敌，羽毛像雨一样落下',
      make(I, W) { I.d.next = now() + 8; I.d.got = 0; I.d.fe = []; toast('🪶 天上有东西在烧……燃烧的羽毛会落下来', '#c8b0ff', 3); },
      tick(I, dt, W, t) { const d = I.d;
        if (t > d.next && d.got + d.fe.length < 6) { d.next = t + 20 + Math.random() * 6; const a = Math.random() * 6.283, r = 3 + Math.random() * 3, x = W.pos.x + Math.sin(a) * r, z = W.pos.z + Math.cos(a) * r, y = W.B.H(x, z); const m = disc(W.B.sc, x, y, z, 1.6, '#a070ff', 0.25); I.objs.push(m); d.fe.push({ x, z, y, ph: 'fall', t: 0, m }); sfx('draw', 0.4, 0.4); }
        for (let i = d.fe.length - 1; i >= 0; i--) { const f = d.fe[i]; f.t += dt;
          if (f.ph === 'fall') { f.m.material.opacity = 0.2 + 0.35 * Math.min(1, f.t / 1.4); if (f.t >= 1.4) { f.ph = 'lie'; f.t = 0; spark(f.x, f.y + 0.3, f.z, 26, 'blue'); if (Math.hypot(W.pos.x - f.x, W.pos.z - f.z) < 1.6) hurt('燃羽', f.x, f.z, 0.08); f.m.material.color.set('#7040c0'); f.m.scale.setScalar(4); f.m.material.opacity = 0.12;
              const g = new (T().Group)(); g.position.set(f.x, f.y, f.z); try { const fl = Assets.flame(0, 0, 0, 2.2, '#b080ff'); if (fl) g.add(fl); } catch (e) { } const gl = glow('#c090ff', 1.4); gl.position.y = 0.3; g.add(gl); W.B.sc.add(g); I.objs.push(g); f.g = g;
              f.it = use(I, f, '捡起燃羽', it => { it.done = true; d.got++; drop(f.g); drop(f.m); d.fe.splice(d.fe.indexOf(f), 1); hurt('燃羽', f.x, f.z, 0.03); toast(`🪶 燃羽 ${d.got}/3`, '#d0b8ff', 1.8); if (d.got >= 3) win('🪶 燃羽凑齐了——堕天使飞不起来了'); }); } }
          else { for (const fo of foesNear(f, 4)) if (fo.hp < fo.maxHp) fo.hp = Math.min(fo.maxHp, fo.hp + fo.maxHp * 0.02 * dt); if (f.t > 16) { if (f.it) f.it.done = true; drop(f.g); drop(f.m); d.fe.splice(i, 1); toast('🪶 一根燃羽烧尽了', '#a090c0', 1.4); } } } },
      hud: I => `🪶 燃羽 ${I.d.got}/3${I.d.fe.some(f => f.ph === 'lie') ? ' · 有一根正在燃烧（E 捡起）' : ' · 等它落下'}` },
    merc: { obj: '工头的契约', ic: '⚒️', col: '#d0c0a0', fog: '#2a2620', story: '她在两个地区都招了工头。工头会来找你签一份契约：限时决斗，输的人归对方处置。', goal: '工头来挑战你：45 秒内、不喝药，打倒她（喝药 = 契约作废）', boss: '每份没赢下的契约 = 工头在 BOSS 战一半血时加入',
      make(I, W) { I.d.t0 = now() + 6; I.d.ph = 'wait'; },
      tick(I, dt, W, t) { const d = I.d;
        if (d.ph === 'wait' && t > d.t0 && !d.sp) { d.sp = 1; const h = newH('工头', '断头台女工的工头', 3), p = spot(W, 10, 14); if (!h) return; spawnFoe(h, p.x, p.z, fo => { fo.tier = Math.max(2, fo.tier | 0); fo.maxHp = fo.hp = Math.round(fo.maxHp * 1.6); fo.iq = Math.max(1.1, fo.iq || 0); d.fo = fo; d.ph = 'duel'; d.until = now() + 45; d.pc = potCount(); d.hp = G.S.hp; try { Foe.say(fo, '签了吧。45 秒，不许喝药。输的人归对方。', '#e8d8b8'); } catch (e) { } toast('⚒️ 工头的契约：45 秒内、不喝药，打倒她', '#e8d8b8', 3.4); }); }
        if (d.ph === 'duel') { const fo = d.fo; if (fo.dead && !fo.escaped) { win('⚒️ 契约赢了——工头不会出现在刑场'); return; }
          const st = G.st(), pc = potCount(); if (pc < d.pc || G.S.hp > d.hp + st.maxHp * 0.3) { d.ph = 'x'; vanish(fo); fail('⚒️ 你喝了药——契约作废，工头会去刑场帮她'); return; } d.hp = G.S.hp; d.pc = pc;
          if (t > d.until) { d.ph = 'x'; vanish(fo); fail('⚒️ 时间到——工头收工走了，会去刑场帮她'); } } },
      hud: I => { const d = I.d; return d.ph === 'duel' ? `⚒️ 契约决斗 · 剩 ${Math.max(0, d.until - now()).toFixed(0)} 秒 · 工头生命 ${Math.max(0, Math.round(d.fo.hp / d.fo.maxHp * 100))}% · 不许喝药` : '⚒️ 工头要来了'; } },
    singer: { obj: '共鸣石', ic: '🎼', col: '#ffc0e0', fog: '#3a1a2a', story: '她把三块共鸣石放进了两个地区，石头会跟着她的歌一起响。只要石头还在唱，声波就会一圈一圈扫过来。', goal: '三块共鸣石会按顺序亮起，记住顺序，再按同样顺序走过去按 E 敲；声波（粉圈）扫来时闪身穿过去', boss: '每处没解开的共鸣石 = BOSS 的节拍声波更密',
      make(I, W) { const c = spot(W, 14, 26); I.d.c = c; I.d.ps = []; I.d.step = 0; I.d.seq = [0, 1, 2].sort(() => Math.random() - 0.5); I.d.wave = now() + 5; I.d.show = 0;
        for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283, x = c.x + Math.sin(a) * 3.2, z = c.z + Math.cos(a) * 3.2, y = W.B.H(x, z), p = { x, y, z }; I.d.ps.push(p); const g = new (T().Group)(); g.position.set(x, y, z); const s = prop(i === 1 ? 'namaqualand_boulder_02' : 'stone_01', { h: 0.9 }); if (s) g.add(s); const gl = glow('#ff9ad0', 1.2); gl.position.y = 1.2; g.add(gl); p.gl = gl; W.B.sc.add(g); I.objs.push(g); use(I, p, `敲共鸣石（第 ${i + 1} 块）`, () => hitStone(I, i), 0.6); } },
      tick(I, dt, W, t) { const d = I.d, near = Math.hypot(W.pos.x - d.c.x, W.pos.z - d.c.z) < 11;
        if (near && !d.shown) { d.shown = 1; d.show = t; toast('🎼 记住石头亮起的顺序！', '#ffc0e0', 2.2); }
        if (d.show) { const k = Math.floor((t - d.show) / 0.8); d.ps.forEach((p, i) => { const on = k < 3 && d.seq[k] === i; p.gl.scale.setScalar(on ? 2.6 : 1.2); if (on && p._k !== k) { p._k = k; sfx('bell', 0.6, [1.2, 1.5, 1.8][i]); } }); if (k >= 3) d.show = 0; }
        if (t > d.wave) { d.wave = t + 7; d.w = { t: 0, hit: 0, m: ringM(W.B.sc, d.c.x, d.c.y, d.c.z, 1, '#ff80c0', 0.6) }; I.objs.push(d.w.m); }
        if (d.w) { const w = d.w; w.t += dt; const r = 1 + w.t * 6.4; w.m.scale.setScalar(r); w.m.material.opacity = 0.6 * (1 - w.t / 2.2); const pd = Math.hypot(W.pos.x - d.c.x, W.pos.z - d.c.z); if (!w.hit && Math.abs(pd - r) < 0.55) { w.hit = 1; hurt('共鸣声波', d.c.x, d.c.z, 0.06); } if (w.t > 2.2) { drop(w.m); d.w = null; } } },
      hud: I => `🎼 共鸣石：按亮起的顺序敲（${I.d.step}/3）· 声波扫来时闪身` },
    shepherd: { obj: '起尸', ic: '⚰️', col: '#a8e0a0', fog: '#1a2a1a', story: '她在两个地区的地下埋了招魂铃。没被砍头的尸体听到铃声，会自己爬起来，走回她的墓园。', goal: '没被斩首的尸体 25 秒后会爬起来（15 秒时脚下发绿光）——砍掉她们的头；这一趟一具都没爬起来 = 破坏成功', boss: '本章爬起来的每具尸体都会在 BOSS 战从坟里回来（最多 6 具）',
      make(I, W) { I.d.watch = []; I.d.risen = 0; toast('⚰️ 守墓人的地区：没被斩首的尸体会爬起来', '#b8e8b0', 3); },
      kill(I, fo) { if (!fo || fo.decap || strong(fo) || fo.rev73) return; I.d.watch.push({ fo, t: 0 }); },
      tick(I, dt, W, t) { const d = I.d; for (let i = d.watch.length - 1; i >= 0; i--) { const e = d.watch[i], fo = e.fo; if (fo.decap || fo.escaped || !fo.f || !fo.f.root.parent) { if (e.m) drop(e.m); d.watch.splice(i, 1); continue; } e.t += dt;
          if (e.t > 15 && !e.m) { e.m = disc(W.B.sc, fo.pos.x, W.B.H(fo.pos.x, fo.pos.z), fo.pos.z, 0.9, '#60ff70', 0.3); I.objs.push(e.m); }
          if (e.m) e.m.material.opacity = 0.2 + 0.25 * Math.abs(Math.sin(t * (e.t > 21 ? 9 : 3)));
          if (e.t > 25) { d.watch.splice(i, 1); if (e.m) drop(e.m); fo.decap = true; fo.rise73 = 1; try { fo.f.root.visible = false; } catch (er) { } d.risen++; const a = A(); if (a) a.v.risen++; const h = JSON.parse(JSON.stringify(fo.h)); h.c.name = '复生的' + (h.c.name || ''); spark(fo.pos.x, fo.pos.y + 0.4, fo.pos.z, 24); sfx('roar', 0.35, 0.5); toast('⚰️ 一具尸体爬了起来——她会记在守墓人的名册上', '#a8e0a0', 2.4); spawnFoe(h, fo.pos.x, fo.pos.z, f2 => { f2.rev73 = 1; f2.maxHp = f2.hp = Math.round(f2.maxHp * 0.55); f2.spdMul = (f2.spdMul || 1) * 0.85; }); } } },
      end(I) { return I.d.risen ? 'fail' : 'win'; },
      hud: I => `⚰️ 爬起来 ${I.d.risen} 具 · ${I.d.watch.length ? `有 ${I.d.watch.length} 具尸体还没砍头` : '砍掉尸体的头'}` },
    alchemist: { obj: '魂水塔', ic: '⚗️', col: '#80f0d0', fog: '#10302a', story: '她在两个地区立起了魂水塔，塔会把你身上的魂晶一点点吸走，蒸馏成她的药。', goal: '魂水塔每 8 秒吸走你这一趟 3% 魂晶：找到它（青光处），拔刀砍 6 下砸碎', boss: '每座没砸碎的塔 = BOSS 战喝一瓶药（加速 / 铁壁 / 再生）',
      make(I, W) { const p = spot(W, 12, 28); I.d.p = p; I.d.hp = 6; I.d.next = now() + 8; I.d.sw = false; const g = new (T().Group)(); g.position.set(p.x, p.y, p.z); const a = prop('wine_barrel_01', { h: 0.9 }); if (a) g.add(a); const b = prop('brass_pot_01', { h: 0.4 }); if (b) { b.position.y = 0.9; g.add(b); } const c = prop('vintage_microscope', { h: 0.45 }); if (c) { c.position.set(0.7, 0, 0.3); g.add(c); } const gl = glow('#60ffd0', 3); gl.position.y = 1.5; g.add(gl); I.d.gl = gl; W.B.sc.add(g); I.objs.push(g); I.d.g = g; const cl = { x: p.x, z: p.z, r: 0.75 }; W.B.cols.push(cl); I.cols.push(cl); },
      tick(I, dt, W, t) { const d = I.d, p = d.p; d.gl.material.opacity = 0.55 + 0.3 * Math.sin(t * 5);
        if (t > d.next) { d.next = t + 8; const c = Math.floor((W.trip.coins || 0) * 0.03); if (c > 0) { W.trip.coins -= c; G.addCoins(-c); toast(`⚗️ 魂水塔吸走了 ${c} 🔮`, '#80f0d0', 1.6); } }
        const C = Foe.ctx && Foe.ctx(), sw = !!(C && C.playerSwinging && C.playerSwinging()); if (sw && !d.sw) { const dx = p.x - W.pos.x, dz = p.z - W.pos.z, dd = Math.hypot(dx, dz), yw = G.player.yaw, fx = -Math.sin(yw), fz = -Math.cos(yw); if (dd < 2.6 && (dx * fx + dz * fz) / Math.max(0.1, dd) > 0.4) { d.hp--; spark(p.x, p.y + 1, p.z, 18, 'blue'); sfx('bell', 0.4, 2.4); d.g.position.x = p.x + (Math.random() - 0.5) * 0.08; if (d.hp <= 0) { spark(p.x, p.y + 1, p.z, 50, 'blue'); win('⚗️ 魂水塔碎了——炼金师少了一瓶药'); } else toast(`⚗️ 魂水塔 ${d.hp}/6`, '#a0ffe0', 0.8); } } d.sw = sw; },
      hud: I => `⚗️ 魂水塔：砍 6 下砸碎（${6 - I.d.hp}/6）· 每 8 秒吸走 3% 魂晶` }
  };
  function hitStone(I, i) { const d = I.d, p = d.ps[i]; if (I.st !== 'live') return; if (d.show) return toast('🎼 先看完顺序', '#ffc0e0', 1);
    if (d.seq[d.step] === i) { d.step++; sfx('bell', 0.7, [1.2, 1.5, 1.8][i]); p.gl.scale.setScalar(2.4); setTimeout(() => { try { p.gl.scale.setScalar(1.2); } catch (e) { } }, 300); if (d.step >= 3) win('🎼 共鸣石安静了——歌姬的合唱少了一个声部'); }
    else { d.step = 0; d.seq = [0, 1, 2].sort(() => Math.random() - 0.5); d.show = now() + 0.6; d.shown = 1; const W = Wd(); if (W && Math.hypot(W.pos.x - d.c.x, W.pos.z - d.c.z) < 6) hurt('共鸣石的尖啸', d.c.x, d.c.z, 0.07); toast('🎼 顺序错了——石头尖叫起来，换了新的顺序', '#ff9ab8', 2); } }

  // ================= 每帧：实例生命周期 =================
  let lastB = null, lastW = null, kills = [];
  function frame(dt) {
    if (!on()) return; const W = Wd(), L = LP(); chTick(dt);
    if (W !== lastW) { if (!W && lastW && I) { if (I.st === 'live') { const S = SCH[I.k]; const r = S && S.end ? S.end(I) : 'fail'; finish(r, r === 'win' ? `✦ 你离开了「${S.obj}」的地区——一具尸体都没爬起来` : `✧ 你离开了，「${S ? S.obj : '布局'}」没有被破坏`); } cleanObjs(); I = null; } if (!W) { clearMood(); CH = null; } lastW = W; }
    if (!W || !L) return; const a = A(); if (!a) return; const bt = L.isBossTrip && L.isBossTrip(); if (bt) { bossTick(dt, W); return; }
    const S = SC(); if (!S) return; const t = now();
    if (W.B !== lastB) { lastB = W.B; if (I && I.B !== W.B) { cleanObjs(); I.B = null; } }
    if (!fieldOK(W)) return;
    if (!a.cine && cineFree()) { a.cine = 1; playChapterCine(W); return; }
    if (!I && a.res.length < 2 && W.trip && !W.trip.__a73) { W.trip.__a73 = 1; I = { k: B_().id, trip: W.trip, B: null, st: 'live', objs: [], inter: [], cols: [], d: {} }; }
    if (!I || I.st !== 'live') return;
    if (I.B !== W.B) { if (calm(W) || !I.made) { I.B = W.B; const first = !I.made; I.made = 1; try { S.make(I, W); } catch (e) { console.warn('a73 make', e); } setMood(W, S.fog, I.k === 'lady' ? 1.35 : 1.1, I.k === 'foxmiko' ? '#ff9ae0' : null); if (!first) toast(`${S.ic} 「${S.obj}」的气息还在这片地区——在这里也找得到`, S.col, 2.6); } else return; }
    if (S.tick) try { S.tick(I, dt, W, t); } catch (e) { console.warn('a73 tick', I.k, e); }
    hud(S);
  }
  const calm = W => !(W.foes || []).some(f => !f.dead && f.seen && (f.state === 'chase' || f.atk));
  const cineFree = () => { try { if (window.Saga && Saga.pendingCine && Saga.pendingCine()) return false; if (window.NemStory && NemStory.busy) return false; if (window.Arrival2 && Arrival2.isOpen && Arrival2.isOpen()) return false; if (window.CineStage && CineStage.active) return false; if (G.uiOpen) return false; const W = Wd(); return !!(W && calm(W) && !(window.NemStory && NemStory.hold && NemStory.hold())); } catch (e) { return false; } };

  // ---------------- HUD：一行布局提示（M73 有主线面板时由它统一显示）----------------
  let hudEl = null, hudTxt = '', hudAt = 0;
  function line() { if (!I || I.st !== 'live' || !Wd()) return ''; const S = SCH[I.k]; try { return `${S.ic} 使徒的布局 · ${S.obj}：${S.hud(I)}`; } catch (e) { return ''; } }
  function hud(S) { const t = now(); if (t - hudAt < 0.25) return; hudAt = t; if (window.M73 && M73.ownsHud && M73.ownsHud()) { if (hudEl) hudEl.style.display = 'none'; return; }
    if (!hudEl) { hudEl = document.createElement('div'); hudEl.id = 'a73hud'; hudEl.style.cssText = 'position:fixed;left:50%;top:58px;transform:translateX(-50%);z-index:20;pointer-events:none;font:600 13px/1.5 inherit;color:#fff;text-shadow:0 1px 3px #000;background:rgba(10,6,16,.55);padding:3px 12px;border-left:3px solid ' + S.col; document.body.appendChild(hudEl); }
    const s = line(); hudEl.style.display = s ? 'block' : 'none'; if (s !== hudTxt) { hudTxt = s; hudEl.textContent = s; } }
  setInterval(() => { if (hudEl && (!Wd() || !I || I.st !== 'live')) hudEl.style.display = 'none'; }, 500);

  // ---------------- 事件：罪状 / 起尸 ----------------
  function onEv(t, fo) { if (!on() || !LP()) return; const L = LP(); if (L.isBossTrip && L.isBossTrip()) return; const B = B_(); if (!B) return; const a = A(); if (!a) return;
    if (t === 'decap' && B.id === 'inquisitor' && !fo.rise73) { a.v.crime++; if (a.v.crime % 3 === 0) toast(`📜 罪状 +1（共 ${a.v.crime} 条）——审判官在记`, '#f0e6c8', 1.6); }
    if (t === 'kill' && I && I.st === 'live' && SCH[I.k].kill) SCH[I.k].kill(I, fo); }

  // ================= 电影 =================
  const durOf = s => Math.min(6, 1.0 + String(s).length / 10);
  function beat(shot, lines, o) { let t = 0.5; const ls = lines.filter(Boolean).map(l => { const L0 = typeof l === 'string' ? { t: l } : l; const r = { t: L0.t, w: L0.w || '', col: L0.col || '', it: !!L0.it, at: t, d: durOf(L0.t) }; t += r.d + 0.15; return r; }); return Object.assign({ shot, lines: ls, dur: Math.max((o && o.min) || 3.8, t + 0.4) }, o || {}); }
  function playChapterCine(W) {
    const B = B_(), S = SC(); if (!B || !S || !window.Saga || !Saga.reel) return false; const ch = A().ch;
    const beats = [
      beat('top', [{ t: B.story, it: true }], { card: { a: `第 ${ch} 章`, b: `${B.title}`, c: `月之巫女的第 ${B.ch} 位使徒` }, min: 6 }),
      beat('crane', [{ t: B.intro }], { cc: { col: B.col, k: '月 之 使 徒', n: B.n, t: B.title, ch: [...(B.traits || []).slice(0, 2), '擂台 · ' + B.place] }, min: 5 }),
      beat('orbit', [{ t: S.story }], { tag: `使徒的布局 · ${S.ic} ${S.obj}`, min: 5 }),
      beat('low', [{ t: '这一章：' + S.goal, col: '#ffe28a' }, { t: '如果放着不管：' + S.boss, col: '#ff9a8a' }], { min: 7 }),
      beat('push', [{ t: B.say, w: `${B.n} · ${B.title}`, col: B.col }], { min: 4 }),
      beat('door', [{ t: `两个地区之后，「${B.place}」见。`, w: '我', col: '#fff', it: true }], { min: 3.6 })
    ];
    try { return Saga.reel({ beats, col: B.col, k: (ndOf(W) && ndOf(W).loc && ndOf(W).loc.k) || '' }); } catch (e) { console.warn('a73 cine', e); return false; }
  }
  function bossSummary() { const S = SC(), a = A(); if (!S || !a) return []; const f = fails(), w = wins(), n = a.res.length, out = [];
    if (S === SCH.inquisitor) out.push(`罪状 ${a.v.crime} 条 · 烧掉的告示板 ${w}/2 → 审判等级 ${judgeLv()}`);
    else if (S === SCH.shepherd) out.push(`本章爬起来的尸体：${a.v.risen} 具 → ${Math.min(6, a.v.risen)} 具会从坟里回来`);
    else out.push(`你破坏了 ${w}/2 处「${S.obj}」${n < 2 ? `（还有 ${2 - n} 处没遇到）` : ''}`);
    out.push(f ? '没破坏的那些：' + S.boss : '她的布局全被你拆了——这一战她只有自己。'); return out; }
  function playBossCine(W, fo) { const B = B_(); if (!B || !window.Saga || !Saga.reel) return false; const sm = bossSummary();
    const beats = [beat('crane', [{ t: B.intro }], { card: { a: `第 ${A().ch} 章 · 章 节 B O S S`, b: B.n, c: `「${B.title}」· ${B.place}` }, min: 5.5 }), beat('orbit', sm.map((t, i) => ({ t, col: i ? '#ff9a8a' : '#ffe28a' })), { tag: '你在这一章做过的事', min: 6 }), beat('push', [{ t: B.say, w: `${B.n} · ${B.title}`, col: B.col }], { min: 4 })];
    try { return Saga.reel({ beats, col: B.col }); } catch (e) { return false; } }

  // ================= BOSS 战 =================
  let BS = null; // { fo, ph:[{at,fn,done}], ... }
  const judgeLv = () => { const a = A(); return a ? Math.min(4, Math.floor(a.v.crime / 6) + (2 - wins())) : 0; };
  function bossTick(dt, W) {
    const fo = (window.Foe && Foe.foes || []).find(f => f.boss && f.boss.k && /^ch\d+/.test(f.boss.k) && !f.nemClone); if (!fo) return; const a = A(), S = SC(), t = now();
    if (!BS || BS.fo !== fo) { BS = { fo, ph: [], at: t, objs: [], hz: [] }; setup(fo, S, a); }
    if (!a.bcine) { if (t - BS.at > 4) a.bcine = 1; else if (cineFree()) { a.bcine = 1; playBossCine(W, fo); return; } }
    if (fo.dead) { for (const o of BS.objs) drop(o); BS.objs = []; for (const h of BS.hz) drop(h.m); BS.hz = []; fo.ward73 = null; return; }
    const k = fo.hp / fo.maxHp; for (const p of BS.ph) if (!p.done && k <= p.at) { p.done = 1; try { p.fn(fo, W); } catch (e) { console.warn('a73 phase', e); } }
    if (BS.tick) try { BS.tick(fo, dt, W, t); } catch (e) { console.warn('a73 boss', e); }
    for (let i = BS.hz.length - 1; i >= 0; i--) { const h = BS.hz[i]; h.t += dt; if (h.m) h.m.material.opacity = 0.18 + 0.4 * Math.min(1, h.t / h.d); if (h.t >= h.d) { spark(h.x, h.y + 0.4, h.z, 20, h.col === 'blue' ? 'blue' : null); if (Math.hypot(W.pos.x - h.x, W.pos.z - h.z) < h.r) hurt(h.n, h.x, h.z, h.k); drop(h.m); BS.hz.splice(i, 1); } }
  }
  function warnAt(W, x, z, r, d, n, k, col) { const y = W.B.H(x, z), m = disc(W.B.sc, x, y, z, r, col || '#ff3030', 0.2); BS.hz.push({ x, y, z, r, d, n, k, m, t: 0 }); }
  function bossLine(fo, s) { try { Foe.say(fo, s, '#ffb0a0'); } catch (e) { } }
  function wax(fo, n, name, set) { const W = Wd(); for (let i = 0; i < n; i++) { const h = JSON.parse(JSON.stringify(fo.h)); delete h.__boss; if (h.c) { delete h.c.boss; delete h.c.chBoss; h.c.name = name + (i + 1); h.c.rar = 2; } const a = Math.random() * 6.283; spawnFoe(h, fo.pos.x + Math.sin(a) * 4, fo.pos.z + Math.cos(a) * 4, f2 => { f2.maxHp = f2.hp = Math.max(10, Math.round(fo.maxHp * 0.1)); f2.dmgMul = (f2.dmgMul || 1) * 0.8; if (set) set(f2); }); } }
  function setup(fo, S, a) {
    const n = fails(), B = B_(); if (!S) return;
    if (n === 0 && S !== SCH.inquisitor && S !== SCH.shepherd) { setTimeout(() => toast(`✦ 「${S.obj}」全被你破坏了——${B.n} 没有任何后手`, '#ffe28a', 3.5), 2500); return; }
    const id = B.id;
    if (id === 'nun') for (let i = 0; i < n; i++) BS.ph.push({ at: i ? 0.38 : 0.7, fn: f => shieldPhase(f) });
    if (id === 'countess') BS.ph.push({ at: 0.6, fn: f => { bossLine(f, '我的收藏们——出来见客。'); toast(`🕯️ ${2 * n} 座蜡像替身走了出来——它们碎的时候会炸开`, '#ffd8a0', 3); wax(f, 2 * n, '蜡像', f2 => { f2.aff = Object.assign(f2.aff || {}, { volatile: 1 }); }); } });
    if (id === 'huntress') { fo.dmgMul = (fo.dmgMul || 1) * (1 + 0.12 * n); BS.ph.push({ at: 0.5, fn: f => { bossLine(f, '嗷呜——孩子们，开饭了！'); for (let i = 0; i < 2 * n; i++) { const h = newH('猎犬', '狼月猎手的猎犬', 2); if (h) spawnFoe(h, f.pos.x + (Math.random() - 0.5) * 10, f.pos.z + (Math.random() - 0.5) * 10, f2 => { f2.spdMul = (f2.spdMul || 1) * 1.15; }); } } }); }
    if (id === 'lady') { fo.aff = Object.assign(fo.aff || {}, { phantom: 1 }); setMood(Wd(), '#d0e0d8', 1.5, null); BS.ph.push({ at: 0.5, fn: f => { bossLine(f, '客人们……都回来了。'); wax(f, n, '雾影', f2 => { f2.aff = Object.assign(f2.aff || {}, { phantom: 1 }); }); } }); }
    if (id === 'inquisitor') { const lv = judgeLv(); if (lv) { fo.maxHp = fo.hp = Math.round(fo.maxHp * (1 + 0.05 * lv)); BS.jt = now() + 6; BS.tick = (f, dt, W, t) => { if (t < BS.jt || f.broken > 0) return; BS.jt = t + Math.max(3.2, 8.5 - 1.3 * lv); const P = W.pos, pv = W.vel || { x: 0, z: 0 }; bossLine(f, pick(['判决！', '罪加一等。', '肃静！'])); const cnt = lv >= 2 ? 3 : 1; for (let i = 0; i < cnt; i++) warnAt(W, P.x + (pv.x || 0) * 0.5 * i, P.z + (pv.z || 0) * 0.5 * i, 1.6, 1.1 + 0.25 * i, '审判光柱', 0.09, '#fff4c0'); }; setTimeout(() => toast(`📜 审判等级 ${lv}：她会在你脚下落光柱（看白圈，移动）`, '#f0e6c8', 3.2), 2500); } }
    if (id === 'foxmiko') { setMood(Wd(), '#30183a', 1.1, '#ff9ae0'); BS.bt = now() + 8; BS.tick = (f, dt, W, t) => { if (t < BS.bt || f.broken > 0 || f.atk) return; BS.bt = t + 11; const ox = f.pos.x, oz = f.pos.z; warnAt(W, ox, oz, 2.4, 1.3, '月影残像', 0.1, '#ff80e0'); const a = Math.random() * 6.283; f.pos.x = W.pos.x + Math.sin(a) * 3; f.pos.z = W.pos.z + Math.cos(a) * 3; f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.04 * n); spark(f.pos.x, f.pos.y + 1, f.pos.z, 20, 'blue'); bossLine(f, pick(['铃——', '月亮转过来了。', '这边哦。'])); }; }
    if (id === 'fallen') for (let i = 0; i < n; i++) BS.ph.push({ at: i ? 0.33 : 0.66, fn: f => flyPhase(f) });
    if (id === 'merc') BS.ph.push({ at: 0.5, fn: f => { bossLine(f, '加班了，姑娘们。'); for (let i = 0; i < n; i++) { const h = newH('工头', '断头台女工的工头', 3); if (h) spawnFoe(h, f.pos.x + (i ? 4 : -4), f.pos.z + 3, f2 => { f2.tier = 2; f2.maxHp = f2.hp = Math.round(f2.maxHp * 1.6); }); } toast(`⚒️ ${n} 名工头加入了战斗`, '#e8d8b8', 2.6); } });
    if (id === 'singer') { BS.wt = now() + 5; BS.tick = (f, dt, W, t) => { if (t >= BS.wt) { BS.wt = t + Math.max(2.4, 6 - 1.6 * n); BS.wave = { t: 0, x: f.pos.x, z: f.pos.z, hit: 0, m: ringM(W.B.sc, f.pos.x, W.B.H(f.pos.x, f.pos.z), f.pos.z, 1, '#ff80c0', 0.6) }; BS.objs.push(BS.wave.m); }
      const w = BS.wave; if (w) { w.t += dt; const r = 1 + w.t * 7; w.m.scale.setScalar(r); w.m.material.opacity = 0.6 * (1 - w.t / 2); const pd = Math.hypot(W.pos.x - w.x, W.pos.z - w.z); if (!w.hit && Math.abs(pd - r) < 0.55) { w.hit = 1; hurt('节拍声波', w.x, w.z, 0.07); } if (w.t > 2) { drop(w.m); BS.wave = null; } } }; setTimeout(() => toast('🎼 她的歌声会一圈圈扩散——看粉圈，闪身穿过去', '#ffc0e0', 3), 2500); }
    if (id === 'shepherd') { const g = Math.min(6, a.v.risen); if (g) { const wv = [Math.ceil(g / 2), Math.floor(g / 2)]; BS.ph.push({ at: 0.7, fn: f => { bossLine(f, '起来吧。'); for (let i = 0; i < wv[0]; i++) { const h = newH('复生者', '从坟里回来的人', 1); if (h) spawnFoe(h, f.pos.x + (Math.random() - 0.5) * 12, f.pos.z + (Math.random() - 0.5) * 12, f2 => { f2.rev73 = 1; f2.maxHp = f2.hp = Math.round(f2.maxHp * 0.6); }); } toast(`⚰️ ${wv[0]} 具尸体从坟里爬了出来`, '#a8e0a0', 2.6); } }); if (wv[1]) BS.ph.push({ at: 0.35, fn: f => { for (let i = 0; i < wv[1]; i++) { const h = newH('复生者', '从坟里回来的人', 1); if (h) spawnFoe(h, f.pos.x + (Math.random() - 0.5) * 12, f.pos.z + (Math.random() - 0.5) * 12, f2 => { f2.rev73 = 1; f2.maxHp = f2.hp = Math.round(f2.maxHp * 0.6); }); } toast(`⚰️ 又有 ${wv[1]} 具爬了出来`, '#a8e0a0', 2.4); } }); } }
    if (id === 'alchemist') for (let i = 0; i < n; i++) BS.ph.push({ at: i ? 0.4 : 0.75, fn: f => { const k = pick(['haste', 'iron', 'regen']); bossLine(f, '加热完成——干杯。'); if (k === 'haste') { f.spdMul = (f.spdMul || 1) * 1.25; toast('⚗️ 她喝下了「疾行魂水」：移速 +25%', '#80f0d0', 2.6); } else if (k === 'iron') { f.shield = (f.shield || 0) + 3; toast('⚗️ 她喝下了「铁壁魂水」：3 层护盾（蓄力重斩一次打碎）', '#80f0d0', 2.6); } else { f.rg73 = now() + 10; toast('⚗️ 她喝下了「再生魂水」：10 秒内持续回血——快打断她', '#80f0d0', 2.6); } } });
    if (id === 'alchemist') BS.tick = (f, dt) => { if (f.rg73 > now()) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.02 * dt); };
  }
  function shieldPhase(fo) { const W = Wd(); if (!W) return; bossLine(fo, '月亮啊——护住我。'); toast('🩸 血月护盾！她无敌并在回血——去砍碎场上两颗血珠（E 站稳 1.2 秒）', '#ff8090', 3.4); sfx('bell', 0.7, 0.6);
    const left = { n: 2 }; const m = glow('#ff2040', 3.4); W.B.sc.add(m); BS.objs.push(m); fo.ward73 = () => { try { Foe.ctx().floatDmg(fo.anchor.pos, '血盾', false); } catch (e) { } return true; };
    const end = () => { fo.ward73 = null; drop(m); fo.broken = Math.max(fo.broken || 0, 2.2); fo.stag = Math.max(fo.stag || 0, 1.6); toast('🩸 血月护盾碎了——她跪下了！', '#ffe070', 2.4); };
    const tmp = { inter: [], cols: [], objs: [] };
    for (let i = 0; i < 2; i++) { const a = Math.random() * 6.283, x = fo.pos.x + Math.sin(a + i * Math.PI) * 7, z = fo.pos.z + Math.cos(a + i * Math.PI) * 7, v = new (T().Vector3)(x, 0, z); if (W.B.lp && W.B.lp.clamp) W.B.lp.clamp(v, 2); const p = { x: v.x, y: W.B.H(v.x, v.z), z: v.z }; const o = glow('#ff3050', 1.6); o.position.set(p.x, p.y + 1.1, p.z); W.B.sc.add(o); BS.objs.push(o);
      use(tmp, p, '砍碎血珠（站稳 1.2 秒）', it => channel('砍碎血珠', 1.2, p, () => { it.done = true; drop(o); spark(p.x, p.y + 1.1, p.z, 30); left.n--; if (left.n <= 0 && fo.ward73) end(); else toast('🩸 还剩一颗血珠', '#ff9aa8', 1.6); })); }
    const t0 = now(); const iv = setInterval(() => { if (!fo.ward73 || fo.dead || !Wd()) { clearInterval(iv); return; } if (!(G.uiOpen)) fo.hp = Math.min(fo.maxHp, fo.hp + fo.maxHp * 0.0035); if (now() - t0 > 16) { clearInterval(iv); fo.ward73 = null; drop(m); for (const it of tmp.inter) it.done = true; toast('🩸 血月护盾消散了——她回了不少血', '#ff9a8a', 2.2); } m.position.set(fo.pos.x, fo.pos.y + 1.2, fo.pos.z); }, 250); }
  function flyPhase(fo) { const W = Wd(); if (!W) return; bossLine(fo, '坠落吧——'); toast('🪶 她飞起来了（无敌）——躲开紫圈里的羽雨，她落地时会摔倒', '#c8b0ff', 3.2);
    fo.ward73 = () => true; fo.yOff = 2.4; fo.sk = null; fo.skCd = 9; const t0 = now(); let next = t0 + 0.6;
    const iv = setInterval(() => { const W2 = Wd(); if (!W2 || fo.dead) { clearInterval(iv); fo.ward73 = null; fo.yOff = 0; return; } if (G.uiOpen) return; const t = now(); fo.atk = null; fo.yOff = 2.4 + Math.sin(t * 3) * 0.2;
      if (t > next) { next = t + 0.75; const pv = W2.vel || { x: 0, z: 0 }; warnAt(W2, W2.pos.x + (pv.x || 0) * 0.6 + (Math.random() - 0.5) * 1.5, W2.pos.z + (pv.z || 0) * 0.6 + (Math.random() - 0.5) * 1.5, 1.4, 1.0, '羽雨', 0.07, '#a070ff'); }
      if (t - t0 > 7) { clearInterval(iv); fo.ward73 = null; fo.yOff = 0; fo.broken = Math.max(fo.broken || 0, 2.2); fo.stag = Math.max(fo.stag || 0, 1.8); try { W2.shake = 0.5; } catch (e) { } toast('🪶 她摔了下来——破绽！', '#ffe070', 2); } }, 100); }

  // ---------------- 选地点界面：BOSS 卡片下面加一行「她的布局」----------------
  function cardInfo() { if (!on() || !LP()) return ''; const S = SC(), B = B_(), a = A(); if (!S || !B || !a) return ''; const n = a.res.length;
    const st = a.res.map(r => r === 'win' ? '<b style="color:#ffe28a">✦ 已破坏</b>' : '<b style="color:#ff9a8a">✧ 得逞</b>').concat(Array.from({ length: 2 - n }, () => '<span style="opacity:.6">○ 还没去</span>')).join(' · ');
    return `<div class="a73c" style="margin-top:8px;padding:7px 10px;background:rgba(255,255,255,.05);border-left:3px solid ${S.col};font-size:13px;line-height:1.6;text-align:left"><b style="color:${S.col}">${S.ic} 她的布局：${esc(S.obj)}</b> — ${esc(S.story)}<br>🎯 <b>每个地区：</b>${esc(S.goal)}<br>⚠ <b>放着不管：</b>${esc(S.boss)}<br>本章两处：${st}${B.id === 'inquisitor' ? ` · 📜 罪状 ${a.v.crime} 条` : ''}${B.id === 'shepherd' ? ` · ⚰️ 已爬起 ${a.v.risen} 具` : ''}</div>`; }
  setInterval(() => { try { if (!on()) return; const el = document.getElementById('lpBoss'); if (el && !el.querySelector('.a73c')) { const h = cardInfo(); if (h) { const b = el.querySelector('button'); const d = document.createElement('div'); d.innerHTML = h; if (b) el.insertBefore(d.firstChild, b); else el.appendChild(d.firstChild); } } } catch (e) { } }, 400);

  // ---------------- 接线 ----------------
  let wired = false;
  const potCount = () => { try { if (window.Sack && Sack.on && Sack.on()) return Sack.inv().belt.filter(Boolean).reduce((a, o) => a + (o.n || 0), 0); const it = G.S.items || {}; return (it.potion || 0) + (it.bigpotion || 0); } catch (e) { return 0; } };
  function wire() { if (wired || !window.G || !G.HOOK || !window.Foe || !window.R73) return false; wired = true; G.HOOK.world = G.HOOK.world || []; G.HOOK.world.push(frame); R73.on(onEv); return true; }
  if (!wire()) { const iv = setInterval(() => { if (wire()) clearInterval(iv); }, 400); }
  function status() { const S = SC(), B = B_(), a = A(); if (!S || !B || !a) return null; return { B, S, res: a.res.slice(), crime: a.v.crime, risen: a.v.risen, live: line(), fails: fails(), wins: wins(), judge: judgeLv() }; }
  return { on, SCH, status, line, cardInfo, bossSummary, A, _dbg: { get I() { return I; }, frame, playChapterCine, setup } };
})();
