// R36 角色成长重做 · 引擎（window.Talents，MOD talent_tree）
// 属性点（每级 3）+ 技能点（每级 1 + 里程碑）→ 6 大流派 78 节点 → 31 个主动技能 + 闪身，挂到 2 行 × 10 格的快捷栏（1-0 / Shift+1-0）。
// 数据在 js/talents_data.js，界面在 js/talents_ui.js。钩子：foe.js hit()/dot()、worlds.js hitPlayer/foeEvent0/gainXp/移动、rpg.js stats/等级曲线。
window.Talents = (() => {
  const D = window.TalData, V3 = THREE.Vector3;
  const on = () => !window.Mods || Mods.on('talent_tree');
  const G0 = () => window.G, nowS = () => performance.now() / 1000;
  const WW = () => (window.Worlds && Worlds.active ? Worlds._W : null);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sfx = (n, v, r) => { try { if (window.SFX && SFX.play) SFX.play(n, v == null ? 0.5 : v, r == null ? 1 : r); } catch (e) { } };
  const toast = (t, c, s) => { try { G0().toast && G0().toast(t, c || '#ffd27a', s || 1.4); } catch (e) { } };

  // ================= 存档状态 =================
  function tal(S) {
    S = S || G0().S; let t = S.tal;
    if (!t) t = S.tal = { at: {}, n: {}, bar: new Array(20).fill(null), ver: 1, free: 0, hist: [], seen: 0 };
    if (!t.bar || t.bar.length < 20) t.bar = (t.bar || []).concat(new Array(20 - (t.bar || []).length).fill(null));
    return t;
  }
  const bump = () => { const t = tal(); t.ver = (t.ver || 0) + 1; _agg = null; };

  // ================= 等级 / 点数 =================
  const need = lv => Math.round(28 + 9 * Math.pow(lv, 1.6)); // 升到下一级所需经验（比旧曲线后期平缓，保证 Lv 30+ 也练得到）
  const lv = () => (window.RPG ? RPG.lvOf(G0().S.xp).lv : 1);
  function pts() {
    const S = G0().S, l = lv(), b = Math.min(10, Object.keys(S.bosses || {}).length), el = Math.min(6, S.el && S.el.dead ? Object.keys(S.el.dead).length : 0);
    return { attr: 3 * (l - 1), skill: l + 1 + Math.floor(l / 10) + b + el, boss: b, elite: el };
  }
  function spent() {
    const t = tal(); let a = 0, s = 0; for (const k in t.at) a += t.at[k] || 0;
    const sch = {}; for (const id in t.n) { const nd = D.ALL[id]; if (!nd) continue; const c = t.n[id] * nd.cost; s += c; sch[nd.school] = (sch[nd.school] || 0) + c; }
    return { attr: a, skill: s, sch };
  }
  const left = () => { const p = pts(), u = spent(); return { attr: p.attr - u.attr, skill: p.skill - u.skill }; };
  const rank = id => tal().n[id] || 0;
  const known = id => id === 'dodge' || rank(id) > 0;

  let _agg = null, _aggT = null;
  function agg() {
    const t = tal(); if (_agg && _aggT === t) return _agg; const a = {};
    for (const id in t.n) { const nd = D.ALL[id]; if (!nd) continue; const r = t.n[id]; for (const k in nd.m) a[k] = (a[k] || 0) + nd.m[k] * r; }
    _agg = a; _aggT = t; return a;
  }

  // ---- 分配 ----
  function canRank(id) {
    const nd = D.ALL[id]; if (!nd) return 'x'; const t = tal(), r = rank(id);
    if (r >= nd.max) return 'max'; const u = spent(); if (left().skill < nd.cost) return 'pts';
    if ((u.sch[nd.school] || 0) < D.TIER_REQ[nd.tier]) return 'tier';
    for (const q of nd.need) if (!rank(q)) return 'need'; return '';
  }
  function alloc(id) {
    if (canRank(id)) return false; const t = tal(); t.n[id] = rank(id) + 1; t.hist.push(id); if (t.hist.length > 60) t.hist.shift(); bump();
    const nd = D.ALL[id]; if (nd.type === 'a' && D.SK[id]) autoPlace(id); save(); return true;
  }
  function undo() { // 撤销最近一次加点（本次打开面板内可无限撤销，关闭面板即“确认”）
    const t = tal(); while (t.hist.length) { const id = t.hist.pop(); if (id[0] === '@') { const k = id.slice(1); if (t.at[k] > 0) { t.at[k]--; bump(); save(); return true; } continue; } if (!rank(id)) continue; const nd = D.ALL[id];
      // 撤销后若有别的节点依赖它（前置 / 层门槛），不允许
      t.n[id]--; if (!t.n[id]) delete t.n[id]; let bad = false; const u = spent();
      for (const k in t.n) { const n2 = D.ALL[k]; if (n2.need.includes(id) && !rank(id)) bad = true; if ((u.sch[n2.school] || 0) < D.TIER_REQ[n2.tier]) bad = true; }
      if (bad) { t.n[id] = (t.n[id] || 0) + 1; t.hist.push(id); return false; }
      if (!rank(id)) for (let i = 0; i < t.bar.length; i++) if (t.bar[i] === id) t.bar[i] = null; bump(); save(); return true; }
    return false;
  }
  function allocAttr(k, n) { n = n || 1; const L = left().attr; n = Math.min(n, L); if (n <= 0) return 0; const t = tal(); t.at[k] = (t.at[k] || 0) + n; t.hist.push('@' + k); bump(); save(); return n; }
  function resetCost() { const l = lv(); return tal().free ? Math.round(40 * l + 60) : 0; }
  function reset(kind) { // kind: 'attr' | 'skill' | 'all'
    const c = resetCost(), g = G0(); if (c > 0 && (g.S.coins || 0) < c) { toast(`🔮 魂晶不足（洗点需要 ${c}）`, '#ff9a7a', 1.6); return false; }
    if (c > 0) { g.addCoins ? g.addCoins(-c) : (g.S.coins -= c); } const t = tal(); t.free = 1;
    if (kind === 'attr' || kind === 'all') t.at = {}; if (kind === 'skill' || kind === 'all') { t.n = {}; t.bar = new Array(20).fill(null); } t.hist = []; bump(); save(); toast(c ? `已洗点（-${c} 魂晶）` : '已洗点（第一次免费）', '#9fe8b0'); return true;
  }
  function presetAttr(b) { const tot = left().attr; if (tot <= 0) return; const w = Object.values(b.attr).reduce((a, c) => a + c, 0); let rest = tot; const ks = Object.keys(b.attr); ks.forEach((k, i) => { const x = i === ks.length - 1 ? rest : Math.floor(tot * b.attr[k] / w); rest -= x; allocAttr(k, x); }); }
  function applyBuild(id) {
    const b = D.BUILDS.find(x => x.id === id); if (!b) return 0; presetAttr(b); let n = 0; for (const nid of b.ord) { if (!canRank(nid)) { alloc(nid); n++; } }
    for (let guard = 0; guard < 80 && left().skill > 0; guard++) { // 推荐顺序用完后，按主系 → 副系、由浅到深把剩余点数补满
      let did = false; for (const sid of b.sc) { const sc = D.SCHOOLS.find(x => x.id === sid); for (const nd of sc.nodes.slice().sort((p, q) => p.tier - q.tier)) { if (nd.type === 'p' && !canRank(nd.id)) { alloc(nd.id); n++; did = true; break; } } if (did) break; }
      if (!did) break; }
    return n;
  }

  // ---- 快捷栏 ----
  function autoPlace(id) { const t = tal(); if (t.bar.includes(id)) return; const i = t.bar.indexOf(null); if (i >= 0) t.bar[i] = id; }
  function setSlot(i, id) { const t = tal(); if (id && !known(id)) return; if (id) for (let j = 0; j < t.bar.length; j++) if (t.bar[j] === id) t.bar[j] = t.bar[i]; t.bar[i] = id || null; save(); }
  function save() { try { G0().save && G0().save(); } catch (e) { } }

  // ================= 属性接入（rpg.stats 钩子）=================
  function bonus(S, bb) { if (!on()) return bb; const t = tal(S), o = Object.assign({}, bb); for (const k in t.at) o[k] = (o[k] || 0) + (t.at[k] || 0); return o; }
  function post(S, o) {
    if (!on()) return; const a = agg(); tal(S);
    if (a.hpP) o.maxHp = Math.round(o.maxHp * (1 + a.hpP / 100));
    o.crit = 5 + (a.crit || 0) + o.agi * 0.25; o.critD = 150 + (a.critD || 0) + o.ter * 1.5;
    o.manaMax = Math.round(60 + o.soul * 3 + (a.mana || 0)); o.manaReg = 2 + o.soul * 0.08 + (a.manaReg || 0);
    o.cdr = Math.min(45, (a.cdr || 0) + o.agi * 0.2); o.dr = Math.min(80, a.dr || 0); o.avoid = a.avoid || 0; o.regenP = (a.regen || 0) + o.con * 0.02;
  }

  // ================= 运行时（不存档）=================
  const M = { mana: 60, cds: {}, gcd: 0, buffs: {}, flags: {}, eat: [], shield: 0, shieldT: 0, undyAt: 0, target: null, tgtT: 0, W: null, invulT: 0, combat: 0, cast: null };
  const FX = [], PR = [], ZN = [], TM = [];
  const maxMana = () => { const s = G0().st(); return s.manaMax || 60; };
  const addMana = n => { M.mana = clamp(M.mana + n, 0, maxMana()); };
  const heal = n => { const g = G0(), s = g.st(); if (!(n > 0)) return; g.S.hp = Math.min(s.maxHp, g.S.hp + n); };
  const healP = p => heal(G0().st().maxHp * p / 100);
  function buff(id, dur, o) { M.buffs[id] = Object.assign({ t: dur, dur, ic: '✨', n: id, col: '#ffd27a', m: {}, id }, o || {}); return M.buffs[id]; }
  const bm = k => { let v = 0; for (const id in M.buffs) v += M.buffs[id].m[k] || 0; return v; };
  const hasB = id => !!M.buffs[id];
  const flag = f => { const b = M.buffs['f_' + f]; return !!b; };
  const setFlag = (f, dur, ic, n, col) => buff('f_' + f, dur, { ic, n, col, flag: 1 });
  const eatFlag = f => { M.eat.push('f_' + f); };
  const cdr = () => clamp((G0().st().cdr || 0) / 100, 0, 0.6);
  function cutCds(sec) { const t = nowS(); for (const k in M.cds) if (M.cds[k] > t) M.cds[k] = Math.max(t, M.cds[k] - sec); }
  function cutCdsP(p) { const t = nowS(); for (const k in M.cds) if (M.cds[k] > t) M.cds[k] = t + (M.cds[k] - t) * (1 - p); }

  // ---- 场景 / 目标工具 ----
  const _v = new V3(), _d = new V3();
  const plPos = () => { const W = WW(); return W ? W.pos : G0().player.pos; };
  const fwd = () => { const y = G0().player.yaw; return new V3(-Math.sin(y), 0, -Math.cos(y)); };
  const aimDir = () => { const c = G0().camera; c.getWorldDirection(_d); return _d.clone(); };
  const sceneOf = () => { const W = WW(); return (W && W.B && W.B.sc) || G0().scene; };
  const Hgt = (x, z) => { const W = WW(); return W && W.B && W.B.H ? W.B.H(x, z) : 0; };
  const foes = () => (window.Foe && Foe.foes ? Foe.foes.filter(f => !f.dead && !f.escaped) : []);
  const ctr = fo => { const p = fo.pos.clone(); p.y += 1.0; return p; };
  const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  function foesIn(pos, r) { return foes().filter(f => dist2(f.pos, pos) <= r + 0.35); }
  function aimFoe(range, cone) { // 准星附近的敌人（没有则最近的）
    const P = plPos(), dir = aimDir(), cam = G0().camera.getWorldPosition(new V3()); let best = null, ba = 1e9;
    for (const f of foes()) { const c = ctr(f), d = dist2(f.pos, P); if (d > range) continue; const v = c.clone().sub(cam).normalize(), a = Math.acos(clamp(v.dot(dir), -1, 1)); if (a < (cone || 0.4) && a < ba) { ba = a; best = f; } }
    if (!best) { let bd = 1e9; for (const f of foes()) { const d = dist2(f.pos, P); if (d <= range * 0.75 && d < bd) { bd = d; best = f; } } }
    return best;
  }
  function groundAim(maxD) { // 准星指向的地面点
    const P = plPos(), dir = aimDir(), cam = G0().camera.getWorldPosition(new V3()); let t = 2; const hp = new V3();
    for (; t < maxD; t += 0.5) { hp.copy(cam).addScaledVector(dir, t); if (hp.y <= Hgt(hp.x, hp.z) + 0.2) break; }
    const tgt = aimFoe(maxD, 0.25); if (tgt && dir.y > -0.6) return tgt.pos.clone();
    hp.y = Hgt(hp.x, hp.z); if (dist2(hp, P) > maxD) { hp.set(P.x, 0, P.z).addScaledVector(fwd(), maxD); hp.y = Hgt(hp.x, hp.z); } return hp;
  }
  const faceTo = p => { const P = plPos(); G0().player.yaw = Math.atan2(-(p.x - P.x), -(p.z - P.z)); };

  // ---- 特效（加色环 / 球 / 弧 / 闪电）----
  const _geo = {};
  const geo = (k, f) => _geo[k] || (_geo[k] = f());
  const amat = (col, op) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op == null ? 0.8 : op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  function addFx(m, life, upd, pos) { if (pos) m.position.copy(pos); sceneOf().add(m); FX.push({ m, t: 0, life, upd }); return m; }
  function ring(pos, col, r0, r1, life, y) {
    const m = new THREE.Mesh(geo('ring', () => new THREE.RingGeometry(0.85, 1, 48)), amat(col, 0.85)); m.rotation.x = -Math.PI / 2; m.position.set(pos.x, (y != null ? y : Hgt(pos.x, pos.z)) + 0.08, pos.z);
    return addFx(m, life || 0.5, (f, k) => { f.m.scale.setScalar(r0 + (r1 - r0) * k); f.m.material.opacity = 0.85 * (1 - k); });
  }
  function disc(pos, col, r, life) { // 预警圈（红圈）
    const m = new THREE.Mesh(geo('disc', () => new THREE.CircleGeometry(1, 40)), amat(col, 0.28)); m.rotation.x = -Math.PI / 2; m.position.set(pos.x, Hgt(pos.x, pos.z) + 0.07, pos.z); m.scale.setScalar(r);
    return addFx(m, life, (f, k) => { f.m.material.opacity = 0.18 + 0.25 * Math.abs(Math.sin(k * 14)); });
  }
  function flashFx(pos, col, size, life) {
    const m = new THREE.Mesh(geo('orb', () => new THREE.SphereGeometry(1, 12, 10)), amat(col, 0.9)); m.scale.setScalar(size * 0.3);
    return addFx(m, life || 0.25, (f, k) => { f.m.scale.setScalar(size * (0.3 + k)); f.m.material.opacity = 0.9 * (1 - k); }, pos);
  }
  function bolt(a, b, col, life) { // 闪电线
    const pts = [a.clone()], n = 6; for (let i = 1; i < n; i++) { const p = a.clone().lerp(b, i / n); p.x += (Math.random() - 0.5) * 0.5; p.y += (Math.random() - 0.5) * 0.5; p.z += (Math.random() - 0.5) * 0.5; pts.push(p); } pts.push(b.clone());
    const g = new THREE.BufferGeometry().setFromPoints(pts), m = new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    return addFx(m, life || 0.3, (f, k) => { f.m.material.opacity = 1 - k; }, null), m;
  }
  function slashFx(pos, yaw, col, size, life) { // 弧形刃光（竖立的半环）
    const m = new THREE.Mesh(geo('arc', () => new THREE.RingGeometry(0.72, 1, 28, 1, 0, Math.PI)), amat(col, 0.9)); m.scale.setScalar(size); m.position.copy(pos); m.rotation.set(0, yaw, (Math.random() - 0.5) * 1.6);
    return addFx(m, life || 0.25, (f, k) => { f.m.material.opacity = 0.9 * (1 - k); f.m.scale.setScalar(size * (1 + k * 0.4)); });
  }
  function fxFrame(dt) { for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.t += dt; const k = Math.min(1, f.t / f.life); f.upd && f.upd(f, k); if (k >= 1) { f.m.parent && f.m.parent.remove(f.m); if (f.m.material) f.m.material.dispose(); if (f.m.isLine && f.m.geometry) f.m.geometry.dispose(); FX.splice(i, 1); } } }
  const later = (sec, fn) => { TM.push({ t: sec, fn }); };

  // ---- 对敌人：直接伤害 / 控制 / 状态 ----
  function push(fo, dir, dist, t) { t = t || 0.25; if (!fo.dead) fo.kb = { x: dir.x * dist / t, z: dir.z * dist / t, t }; }
  function stun(fo, sec) {
    if (fo.dead) return; const s = fo.boss ? sec * 0.4 : sec; fo.atk = null; fo.block = 0; fo.sk = null; fo.stag = Math.max(fo.stag || 0, s); if (!fo.boss) fo.broken = Math.max(fo.broken || 0, s * 0.6);
    try { fo.f.play('Hit_Knockback', { once: true, fade: 0.05, restart: true }); } catch (e) { }
  }
  function slow(fo, k, sec) { if (fo.dead) return; fo.slowK = Math.min(fo.slowK || 1, k); fo.slowT = Math.max(fo.slowT || 0, sec); }
  function hitFoe(fo, mult, o) {
    o = o || {}; if (!fo || fo.dead || !window.Foe) return false; const P = plPos(), p = ctr(fo);
    try { const cb = fo.f && fo.f.bones && (fo.f.bones[o.zone || 'chest'] || fo.f.bones.spine); if (cb) cb.getWorldPosition(p); } catch (e) { }
    const dir = _v.set(p.x - P.x, 0, p.z - P.z).normalize().clone(), was = fo.block;
    if (!o.keepBlock) fo.block = 0;
    const r = Foe.hit(fo, { mm: true, zone: o.zone || 'chest', point: p, vel: dir.clone().multiplyScalar(o.kb ? 12 : 8), speed: o.speed || 9, tipSpeed: 9, kind: o.kind || 'slash', from: 0, mult, skill: true, spell: !!o.spell, back: !!o.back, crit: !!o.crit, proc: !!o.proc, over: !!o.over });
    if (!fo.dead && was > 0 && !o.proc) fo.stag = Math.max(fo.stag || 0, 0.5);
    if (o.kb && !fo.dead) push(fo, dir, o.kb); if (o.stun && !fo.dead) stun(fo, o.stun); if (o.slow && !fo.dead) slow(fo, o.slow[0], o.slow[1]);
    if (o.fx !== false) sfx('draw', 0.35, 0.9 + Math.random() * 0.4); return r;
  }
  const refDmg = fo => { try { const c = Foe.ctx(); return 12 * c.power(fo || { rar: 1 }); } catch (e) { return 12; } };
  function dot(fo, kind, dps, dur, stackMax) {
    if (fo.dead) return; const x = fo.tfx || (fo.tfx = {}); let d = x[kind];
    if (!d) d = x[kind] = { t: dur, dps: 0, st: 0, acc: 0 }; d.t = dur;
    if (stackMax) { if (d.st < stackMax) { d.st++; d.dps += dps; } } else d.dps = Math.max(d.dps, dps);
  }
  const DOTC = { bleed: '#ff4a4a', poison: '#7af06a', burn: '#ffa040' };
  function dotFrame(dt) {
    for (const fo of foes()) {
      if (fo.slowT > 0) { fo.slowT -= dt; if (fo.slowT <= 0) { fo.slowK = 1; fo.slowT = 0; } }
      if (fo.mark) { fo.mark.t -= dt; if (fo.mark.t <= 0) fo.mark = null; }
      const x = fo.tfx; if (!x) continue; let any = false;
      for (const k in x) { const d = x[k]; d.t -= dt; if (d.t <= 0) { delete x[k]; continue; } any = true; d.acc += d.dps * dt; if (k === 'poison' && agg().venom) slow(fo, 0.85, 0.4);
        if (d.acc >= 1 && (d.tick = (d.tick || 0) + dt) >= 0.5) { d.tick = 0; const n = Math.floor(d.acc); d.acc -= n; if (Foe.dot) Foe.dot(fo, n); if (fo.dead) break; } }
      if (!any) fo.tfx = null;
    }
  }

  // ---- 投射物 / 区域 ----
  function proj(o) { // {pos, dir, spd, range, r, col, size, arc, pierce, hit(fo, p)}
    let m; if (o.arc) { m = new THREE.Mesh(geo('arc', () => new THREE.RingGeometry(0.72, 1, 28, 1, 0, Math.PI)), amat(o.col, 0.9)); m.scale.set(o.size * 1.4, o.size * 0.9, o.size); m.rotation.set(0, Math.atan2(o.dir.x, o.dir.z), 0); }
    else { m = new THREE.Group(); const a = new THREE.Mesh(geo('orb', () => new THREE.SphereGeometry(1, 12, 10)), amat(o.col, 1)); a.scale.setScalar(o.size * 0.5); const b = new THREE.Mesh(geo('orb', () => new THREE.SphereGeometry(1, 12, 10)), amat(o.col, 0.35)); b.scale.setScalar(o.size); m.add(a, b); }
    m.position.copy(o.pos); sceneOf().add(m); PR.push(Object.assign({ m, t: 0, got: new Set(), dir: o.dir.clone().normalize() }, o)); return m;
  }
  function prFrame(dt) {
    for (let i = PR.length - 1; i >= 0; i--) { const p = PR[i]; const s = p.spd * dt; p.m.position.addScaledVector(p.dir, s); p.t += s; let dead = p.t >= p.range;
      const hp = p.m.position; if (hp.y < Hgt(hp.x, hp.z) + 0.15 && p.dir.y <= 0) dead = true;
      for (const f of foes()) { if (p.got.has(f)) continue; const c = ctr(f); if (Math.hypot(c.x - hp.x, c.z - hp.z) < p.r + 0.4 && Math.abs(c.y - hp.y) < 1.6) { p.got.add(f); p.hit(f, hp.clone()); if (!p.pierce) { dead = true; break; } } }
      if (dead) { if (p.end) p.end(hp.clone()); p.m.parent && p.m.parent.remove(p.m); PR.splice(i, 1); } }
  }
  function zone(o) { ZN.push(Object.assign({ t: o.dur, next: 0 }, o)); }
  function zFrame(dt) { for (let i = ZN.length - 1; i >= 0; i--) { const z = ZN[i]; z.t -= dt; z.next -= dt; if (z.next <= 0) { z.next = z.every || 0.5; z.tick(z); } if (z.t <= 0) { ZN.splice(i, 1); } } }

  // ================= 施法 =================
  const S_ = {}; // 技能实现：S_[id](ctx) → false 表示取消（不耗资源）
  const spellMult = id => 1;
  function spellInfo(id) { return D.SK[id] && D.SK[id].kind === '法术'; }
  function castFail(msg) { toast(msg, '#ff9a7a', 0.8); return false; }
  function cast(id) {
    if (!on() || !id) return false; const g = G0(), W = WW(); if (!W || W.busy || W.dead || g.uiOpen) return false;
    const sk = D.SK[id]; if (!sk) return false; if (!known(id)) return castFail(`🔒 还没学会「${sk.n}」——按 T 打开天赋面板`);
    const t = nowS(); if ((M.cds[id] || 0) > t) { sfx('thud', 0.15, 2); return false; } if (M.gcd > t) return false;
    const s = g.st(); let cost = sk.cost || 0, over = false;
    if (spellInfo(id) && agg().over && Math.random() * 100 < agg().over) { cost = 0; over = true; }
    if (cost > M.mana + 0.01) { toast('魂能不足', '#7ad8ff', 0.7); sfx('thud', 0.15, 2); return false; }
    if (sk.hp && g.S.hp <= s.maxHp * 0.12) return castFail('生命太低，无法献祭');
    if (sk.st && window.Combat && Combat.state && !Combat.useStam(sk.st)) return castFail('体力不足');
    const ok = S_[id] ? S_[id]({ over, sk, s, W }) : false; if (ok === false) return false;
    M.mana -= cost; if (sk.hp) { const c = id === 'r_ult' ? g.S.hp * sk.hp / 100 : s.maxHp * sk.hp / 100; g.S.hp = Math.max(1, g.S.hp - c); }
    M.cds[id] = t + sk.cd * (1 - cdr()); M.gcd = t + 0.3; M.lastCast = { id, t }; if (over) toast('⚡ 过载！', '#7af0ff', 0.8);
    if (window.TalUI && TalUI.cast) TalUI.cast(id); return true;
  }
  const P3 = () => plPos().clone();
  function dashTo(dir, dist, dur, inv) {
    const W = WW(), t = nowS(); dir.y = 0; dir.normalize(); const v = dir.clone().multiplyScalar(dist / dur);
    W.vel.x = v.x; W.vel.z = v.z; W.dashT = dur; W.dashV = v; if (inv) { W.dodgeT = Math.max(W.dodgeT || 0, t + inv); W.dodgeAt = t - 1; }
  }
  const moveDir = () => { const g = G0(), K = g.keys || {}, P = g.player, f = (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0), sd = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0); const fw = new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), rt = new V3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); return new V3().addScaledVector(fw, f || (sd ? 0 : -1)).addScaledVector(rt, sd).normalize(); };
  function pathHits(dir, dist, w, mult, o) { // 沿路径一条线上的敌人
    const P = plPos(); let n = 0; for (const f of foes()) { const dx = f.pos.x - P.x, dz = f.pos.z - P.z, a = dx * dir.x + dz * dir.z, pd = Math.abs(dx * dir.z - dz * dir.x); if (a > -0.5 && a < dist + 0.8 && pd < w) { hitFoe(f, mult, o); n++; } } return n;
  }
  function coneHits(dir, range, half, mult, o) { const P = plPos(); let n = 0; for (const f of foes()) { const dx = f.pos.x - P.x, dz = f.pos.z - P.z, d = Math.hypot(dx, dz); if (d > range) continue; const a = Math.acos(clamp((dx * dir.x + dz * dir.z) / Math.max(0.01, d), -1, 1)); if (a <= half || d < 1.1) { hitFoe(f, mult, o); n++; } } return n; }
  function aoeHits(pos, r, mult, o) { let n = 0; for (const f of foesIn(pos, r)) { hitFoe(f, mult, o); n++; } return n; }
  const Pshake = v => { const W = WW(); if (W) W.shake = Math.max(W.shake || 0, v); };
  const flashS = (c, a, ms) => { try { G0().flash && G0().flash(c, a, ms); } catch (e) { } };
  const need1 = (r, msg) => { if (!r) { castFail(msg || '附近没有目标'); return false; } return true; };

  // ---- 通用：闪身（Q）----
  S_.dodge = () => { const W = WW(), t = nowS(), v = moveDir().multiplyScalar(11); W.vel.x = v.x; W.vel.z = v.z; W.dashT = 0.2; W.dashV = v; W.dodgeAt = t; W.dodgeT = t + 0.38; sfx('draw', 0.5, 0.6); };

  // ---- 刃舞 ----
  S_.b_whirl = () => { const P = P3(); const n = aoeHits(P, 3.2, 1.3); ring(P, '#ffe0a0', 0.8, 3.4, 0.35, P.y); slashFx(new V3(P.x, P.y + 1.1, P.z), 0, '#ffe8b0', 2.4, 0.3); W_spin(); Pshake(0.35); sfx('draw', 0.8, 0.9); void n; };
  const W_spin = () => { const W = WW(); if (W) W.spinT = 0.35; };
  S_.b_lunge = () => { const d = fwd(), P = P3(); dashTo(d, 7, 0.16, 0.3); pathHits(d, 7, 1.5, 1.5, { kind: 'thrust', kb: 1.2 }); for (let i = 0; i < 5; i++) flashFx(P.clone().addScaledVector(d, i * 1.4).add(new V3(0, 1.1, 0)), '#ffe8a0', 0.9, 0.25); Pshake(0.3); sfx('draw', 0.7, 1.3); };
  S_.b_wave = () => { const d = fwd(), P = P3(); P.y += 1.0; P.addScaledVector(d, 0.8); proj({ pos: P, dir: d, spd: 30, range: 20, r: 1.2, col: '#ffe48a', size: 1.3, arc: true, pierce: true, hit: f => { hitFoe(f, 1.6, { kb: 0.6 }); flashFx(ctr(f), '#fff0b0', 1.4, 0.25); } }); sfx('draw', 0.8, 1.6); Pshake(0.15); };
  S_.b_flurry = () => { const W = WW(); for (let i = 0; i < 8; i++) later(i * 0.275, () => { const P = plPos(), L = foes().filter(f => dist2(f.pos, P) < 4.5).sort((a, b) => dist2(a.pos, P) - dist2(b.pos, P)); if (!L.length) return; const f = L[0]; faceTo(f.pos); hitFoe(f, 0.7, {}); const c = ctr(f); slashFx(c, Math.random() * 6, '#ffeab0', 1.3, 0.2); W && (W.spinT = 0.15); }); sfx('draw', 0.8, 1.1); toast('⚔️ 百刃！', '#ffe0a0', 0.9); };
  S_.b_ult = () => { const P = P3(); for (let i = 0; i < 5; i++) later(i * 0.3, () => { const pp = plPos(); const last = i === 4; aoeHits(pp, 5.5, last ? 2.2 : 1.1, { kb: last ? 2.2 : 0 }); ring(pp, last ? '#fff2c0' : '#ffd27a', 0.8, 5.6, 0.4, pp.y); for (let k = 0; k < 4; k++) slashFx(new V3(pp.x + (Math.random() - 0.5) * 6, pp.y + 1 + Math.random() * 1.2, pp.z + (Math.random() - 0.5) * 6), Math.random() * 6, '#ffe8b0', 1.6, 0.3); Pshake(last ? 0.6 : 0.3); sfx('draw', 0.8, 0.8 + i * 0.12); }); flashS('#ffe0a0', 0.25, 300); void P; };

  // ---- 铁壁 ----
  S_.w_bash = () => { const d = fwd(), P = P3(); const n = coneHits(d, 3.6, 1.05, 0.8, { kb: 2.2, stun: 1.4, kind: 'thrust' }); ring(P.clone().addScaledVector(d, 1.6), '#9fd0ff', 0.6, 2.2, 0.3, P.y); Pshake(0.4); sfx('thud', 1, 0.8); void n; };
  S_.w_will = () => { buff('will', 7, { ic: '🗿', n: '钢铁意志', col: '#9fd0ff', m: { dr: 40 } }); addShield(G0().st().maxHp * 0.15, 7); ring(P3(), '#9fd0ff', 0.5, 2.2, 0.5, plPos().y); sfx('bell', 0.4, 0.7); flashS('#9fd0ff', 0.2, 250); };
  S_.w_quake = () => { const P = P3(); aoeHits(P, 5, 1.1, { kb: 2.4, stun: 1.6 }); ring(P, '#c8a070', 0.6, 5.2, 0.5, P.y); ring(P, '#ffd8a0', 0.3, 3.2, 0.35, P.y); Pshake(0.8); sfx('thud', 1, 0.6); flashS('#d0b080', 0.2, 250); };
  S_.w_ward = () => { const s = G0().st(); addShield(s.maxHp * 0.3 + s.soul * 2, 10); ring(P3(), '#7ad8ff', 0.4, 2, 0.5, plPos().y); sfx('bell', 0.5, 1.1); };
  S_.w_ult = () => { const s = G0().st(); buff('fort', 9, { ic: '🏰', n: '战争堡垒', col: '#ffd890', m: { dr: 60, thorns: 60, regen: 2 } }); addShield(s.maxHp * 0.2, 9); const P = P3(); ring(P, '#ffd890', 0.5, 4.5, 0.7, P.y); Pshake(0.5); sfx('bell', 0.7, 0.6); flashS('#ffd890', 0.3, 350); };

  // ---- 影袭 ----
  S_.s_step = () => { const d = moveDir(), P = P3(); dashTo(d, 8, 0.2, 0.55); for (let i = 0; i < 4; i++) flashFx(P.clone().addScaledVector(d, i * 2).add(new V3(0, 1, 0)), '#b8a0ff', 1, 0.45); setFlag('nextBack', 4, '🔪', '影袭', '#b8a0ff'); sfx('draw', 0.5, 0.5); };
  S_.s_blade = () => { buff('poison', 14, { ic: '☠️', n: '毒刃', col: '#7af06a' }); sfx('bell', 0.3, 1.6); flashS('#7af06a', 0.15, 250); toast('☠️ 武器淬毒', '#9af08a', 0.9); };
  S_.s_strike = () => { const f = aimFoe(12, 0.5); if (!need1(f)) return false; const b = new V3(-Math.sin(f.yaw), 0, -Math.cos(f.yaw)), tp = f.pos.clone().addScaledVector(b, 1.6); const W = WW(), P = plPos(); flashFx(P.clone().add(new V3(0, 1, 0)), '#b8a0ff', 1.2, 0.35); W.pos.set(tp.x, Hgt(tp.x, tp.z), tp.z); W.vel.set(0, 0, 0); faceTo(f.pos); flashFx(W.pos.clone().add(new V3(0, 1, 0)), '#b8a0ff', 1.2, 0.35); hitFoe(f, 2.2, { back: true, kind: 'thrust' }); W.dodgeT = Math.max(W.dodgeT || 0, nowS() + 0.3); W.dodgeAt = nowS() - 1; sfx('draw', 0.8, 1.5); Pshake(0.3); };
  S_.s_cloud = () => { const c = groundAim(12); const r = 4.5; ring(c, '#7af06a', 0.5, r, 0.6); zone({ pos: c, dur: 7, every: 0.5, tick: z => { for (const f of foesIn(z.pos, r)) { dot(f, 'poison', refDmg(f) * 0.35 * (1 + (agg().venom || 0) / 100) * (1 + G0().st().soul * 0.012), 1.6, 5); slow(f, 0.7, 0.8); } if (Math.random() < 0.7) flashFx(new V3(c.x + (Math.random() - 0.5) * r * 1.6, c.y + 0.5 + Math.random(), c.z + (Math.random() - 0.5) * r * 1.6), '#6ae05a', 1.4, 0.7); } }); sfx('bell', 0.3, 0.8); };
  S_.s_ult = () => { const P = plPos().clone(), L = foes().filter(f => dist2(f.pos, P) < 14).sort((a, b) => dist2(a.pos, P) - dist2(b.pos, P)).slice(0, 5); if (!need1(L.length)) return false; const W = WW(); W.dodgeT = nowS() + 0.25 * L.length + 0.6; W.dodgeAt = nowS() - 1;
    L.forEach((f, i) => later(i * 0.25, () => { if (f.dead) return; const a = Math.random() * 6.28, tp = f.pos.clone().add(new V3(Math.sin(a) * 1.5, 0, Math.cos(a) * 1.5)); flashFx(plPos().clone().add(new V3(0, 1, 0)), '#b8a0ff', 1.1, 0.3); W.pos.set(tp.x, Hgt(tp.x, tp.z), tp.z); W.vel.set(0, 0, 0); faceTo(f.pos); hitFoe(f, 1.8, { crit: true, kind: 'thrust' }); slashFx(ctr(f), Math.random() * 6, '#d8c8ff', 1.6, 0.25); sfx('draw', 0.8, 1.2 + i * 0.1); Pshake(0.25); }));
    later(L.length * 0.25 + 0.05, () => { W.pos.set(P.x, Hgt(P.x, P.z), P.z); W.vel.set(0, 0, 0); flashFx(P.clone().add(new V3(0, 1, 0)), '#b8a0ff', 1.3, 0.4); }); flashS('#8a70ff', 0.25, 300); };

  // ---- 狂血 ----
  S_.r_roar = () => { const P = P3(); const n = Foe.roar(P, 8); buff('roar', 6, { ic: '📣', n: '战吼', col: '#ffd0a0', m: { dmg: 15 } }); ring(P, '#ffd0a0', 0.8, 8, 0.6, P.y); Pshake(0.6); try { SFX.roar && SFX.roar(1); } catch (e) { } flashS('#ffd0a0', 0.25, 300); toast(`📣 战吼！震慑了 ${n} 人`, '#ffd0a0', 1.2); };
  S_.r_slam = () => { const d = fwd(), P = P3(); const f = foes().length; void f; coneHits(d, 3.4, 1.2, 2.4, { kb: 1.4, bleed: true }); for (const fo of foes()) { const dx = fo.pos.x - P.x, dz = fo.pos.z - P.z, dd = Math.hypot(dx, dz); if (dd < 3.4 && (dx * d.x + dz * d.z) / Math.max(0.01, dd) > 0.36) dot(fo, 'bleed', refDmg(fo) * 0.5, 4); } slashFx(new V3(P.x + d.x * 1.6, P.y + 1.2, P.z + d.z * 1.6), Math.atan2(d.x, d.z), '#ff6a6a', 2.4, 0.3); Pshake(0.5); sfx('thud', 0.9, 0.7); };
  S_.r_lust = () => { buff('lust', 10, { ic: '😡', n: '血之狂热', col: '#ff6a6a', m: { dmg: 25, move: 15, leech: 0.8 } }); ring(P3(), '#ff5050', 0.5, 3, 0.6, plPos().y); try { SFX.roar && SFX.roar(1); } catch (e) { } flashS('#ff3030', 0.3, 350); };
  S_.r_charge = () => { const d = fwd(), P = P3(); dashTo(d, 9, 0.22, 0.35); pathHits(d, 9, 1.6, 1.2, { kb: 2.6, stun: 0.9, kind: 'thrust' }); for (let i = 0; i < 6; i++) flashFx(P.clone().addScaledVector(d, i * 1.6).add(new V3(0, 0.5, 0)), '#ff9a6a', 1.1, 0.4); Pshake(0.6); sfx('thud', 0.9, 0.6); };
  S_.r_ult = () => { buff('slay', 12, { ic: '👹', n: '屠神血祭', col: '#ff3030', m: { dmg: 60, leech: 2.5, dr: 15 } }); const P = P3(); ring(P, '#ff3030', 0.5, 6, 0.8, P.y); Pshake(0.8); try { SFX.roar && SFX.roar(1.5); } catch (e) { } flashS('#ff0000', 0.35, 450); };

  // ---- 魂术 ----
  const spellHit = (f, m, o, ctx) => hitFoe(f, m, Object.assign({ spell: true, over: ctx && ctx.over }, o || {}));
  S_.m_bolt = c => { const d = aimDir(), P = plPos().clone(); P.y += 1.3; P.addScaledVector(d, 0.6); proj({ pos: P, dir: d, spd: 34, range: 28, r: 0.5, col: '#7ad8ff', size: 0.3, hit: f => { spellHit(f, 1.3, { keepBlock: false }, c); flashFx(ctr(f), '#aef0ff', 1, 0.2); } }); sfx('bell', 0.3, 2.2); };
  S_.m_nova = c => { const P = P3(); aoeHits(P, 5.5, 1.0, { spell: true, over: c.over, slow: [0.55, 3.5], kb: 0.8 }); ring(P, '#7ad8ff', 0.6, 5.6, 0.5, P.y); ring(P, '#d0f4ff', 0.3, 3.5, 0.4, P.y); Pshake(0.35); sfx('bell', 0.6, 1.3); };
  S_.m_fire = c => { const d = aimDir(), P = plPos().clone(); P.y += 1.3; P.addScaledVector(d, 0.6); const boom = pos => { aoeHits(new V3(pos.x, 0, pos.z), 2.6, 1.8, { spell: true, over: c.over }); for (const f of foesIn(pos, 2.6)) dot(f, 'burn', refDmg(f) * 0.4 * (1 + G0().st().soul * 0.012), 4); ring(pos, '#ffa040', 0.5, 2.8, 0.4, pos.y); flashFx(pos, '#ffc070', 3, 0.35); Pshake(0.4); sfx('thud', 0.7, 0.9); };
    proj({ pos: P, dir: d, spd: 24, range: 26, r: 0.6, col: '#ff9a40', size: 0.5, hit: (f, p) => { boom(ctr(f)); }, end: pos => { if (pos.y <= Hgt(pos.x, pos.z) + 0.3) boom(pos); } }); sfx('bell', 0.4, 0.6); };
  S_.m_mark = () => { const f = aimFoe(24, 0.4); if (!need1(f)) return false; f.mark = { t: 10, k: 0.25 }; flashFx(ctr(f).add(new V3(0, 0.9, 0)), '#ff4a7a', 1.4, 0.5); ring(f.pos, '#ff4a7a', 0.4, 1.6, 0.6); toast('🔻 死亡印记', '#ff7a9a', 0.9); sfx('bell', 0.4, 0.8); faceTo(f.pos); };
  S_.m_chain = c => { const f0 = aimFoe(18, 0.5); if (!need1(f0)) return false; const seen = new Set(), from = plPos().clone().add(new V3(0, 1.3, 0)); let cur = f0, pos = from, m = 1.15; for (let i = 0; i < 5 && cur; i++) { seen.add(cur); const ff = cur, a = pos.clone(), b = ctr(ff), k = m; later(i * 0.12, () => { bolt(a, b, '#b8f0ff', 0.3); if (!ff.dead) spellHit(ff, k, { fx: false }, c); flashFx(b, '#d8f8ff', 1, 0.2); sfx('bell', 0.3, 2.5 + i * 0.1); }); pos = b; let nx = null, bd = 7; for (const f of foes()) { if (seen.has(f)) continue; const d = dist2(f.pos, cur.pos); if (d < bd) { bd = d; nx = f; } } cur = nx; m *= 0.95; } Pshake(0.2); };
  S_.m_ult = c => { const tg = groundAim(22); disc(tg, '#ff3030', 6.5, 1.25); ring(tg, '#ff6a4a', 6.5, 6.5, 1.2, tg.y); const top = tg.clone(); top.y += 19; const orb = new THREE.Mesh(geo('orb', () => new THREE.SphereGeometry(1, 12, 10)), amat('#ff8a40', 0.95));
    addFx(orb, 1.2, (f, k) => { f.m.position.set(tg.x, tg.y + 1 + 18 * (1 - k), tg.z); f.m.scale.setScalar(2.4 + k); }, top);
    later(1.2, () => { aoeHits(new V3(tg.x, 0, tg.z), 6.5, 4.0, { spell: true, over: c.over, stun: 1.0, kb: 2 }); for (const f of foesIn(tg, 6.5)) dot(f, 'burn', refDmg(f) * 0.5, 4); ring(tg, '#ffa040', 0.5, 7, 0.6, tg.y); flashFx(tg.clone().add(new V3(0, 1, 0)), '#ffd090', 7, 0.5); Pshake(1.0); sfx('thud', 1, 0.5); flashS('#ff9040', 0.4, 400); }); sfx('bell', 0.5, 0.5); toast('☄️ 陨星来袭！', '#ffa060', 1.2); };

  // ---- 猎首 ----
  S_.h_mark = () => { const f = aimFoe(24, 0.4); if (!need1(f)) return false; f.mark = { t: 12, k: 0.2 }; f.bounty = 2; flashFx(ctr(f).add(new V3(0, 0.9, 0)), '#ffd060', 1.4, 0.5); ring(f.pos, '#ffd060', 0.4, 1.6, 0.6); toast('🎯 猎杀标记', '#ffd060', 0.9); sfx('bell', 0.4, 1.2); faceTo(f.pos); };
  S_.h_exec = () => { const P = plPos(), f = foes().filter(x => dist2(x.pos, P) < 6.5).sort((a, b) => dist2(a.pos, P) - dist2(b.pos, P))[0]; if (!need1(f)) return false; faceTo(f.pos); const low = f.hp <= f.maxHp * (f.boss ? 0.15 : 0.35);
    if (low) { flashFx(ctr(f), '#ffd060', 2, 0.4); Foe.execute(f, f.pos.clone().sub(P).setY(0)); toast('⚖️ 处决！', '#ffd060', 0.9); } else hitFoe(f, 1.8, { zone: 'neck', kind: 'slash' }); Pshake(0.4); sfx('draw', 0.8, 0.7); };
  S_.h_bounty = () => { buff('bounty', 15, { ic: '📜', n: '悬赏令', col: '#ffd060', m: { dmg: 15 }, bounty: 1 }); ring(P3(), '#ffd060', 0.5, 3, 0.6, plPos().y); sfx('bell', 0.5, 1.4); flashS('#ffd060', 0.2, 300); };
  S_.h_storm = () => { for (let i = 0; i < 3; i++) later(i * 0.3, () => { const P = plPos(); for (const f of foesIn(P, 4.2)) { if (!f.boss && f.hp <= f.maxHp * 0.25) { Foe.execute(f, f.pos.clone().sub(P).setY(0)); } else hitFoe(f, 0.8, {}); } ring(P, '#ffd060', 0.8, 4.3, 0.35, P.y); slashFx(new V3(P.x, P.y + 1.1, P.z), i * 2, '#ffe8a0', 2.2, 0.3); W_spin(); Pshake(0.35); sfx('draw', 0.8, 0.8 + i * 0.15); }); };
  S_.h_ult = () => { const P = plPos().clone(), L = foesIn(P, 11); if (!need1(L.length)) return false; ring(P, '#ffd060', 1, 11, 0.8, P.y); flashS('#ffd060', 0.35, 400); Pshake(0.7); L.forEach((f, i) => later(0.15 + i * 0.08, () => { if (f.dead) return; f.mark = { t: 8, k: 0.2 }; flashFx(ctr(f).add(new V3(0, 1, 0)), '#ffe080', 1.8, 0.4); hitFoe(f, f.hp < f.maxHp * 0.5 ? 2.6 : 1.3, { stun: 1.0 }); sfx('bell', 0.5, 1 + i * 0.05); })); toast('🔱 审判！', '#ffe080', 1.2); };

  // ================= 护盾 / 受伤 =================
  function addShield(n, sec) { M.shield = (M.shield || 0) + n; M.shieldT = Math.max(M.shieldT || 0, sec); M.shieldMax = Math.max(M.shieldMax || 0, M.shield); }
  const ang = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  function avoid(fo, h) { // 迅捷：完全躲开
    if (!on()) return false; const a = agg().avoid || 0; if (a > 0 && Math.random() * 100 < a) { toast('闪避!', '#c8f0ff', 0.6); sfx('draw', 0.4, 1.8); onEvent('dodge', fo, { avoid: true }); return true; } return false;
  }
  function inDmg(fo, n, h) {
    if (!on() || !(n > 0)) return n; const g = G0(), s = g.st(), S = g.S, a = agg(), t = nowS(), W = WW(); M.combat = 6;
    let dr = (s.dr || 0) + bm('dr'); if (S.hp < s.maxHp * 0.5) dr += a.lowDr || 0;
    if (a.stand && W && Math.hypot(W.vel.x, W.vel.z) < 0.6) dr += 30; n *= 1 - clamp(dr, 0, 85) / 100;
    if (M.shield > 0) { const ab = Math.min(M.shield, n); M.shield -= ab; n -= ab; if (M.shield <= 0) { M.shield = 0; M.shieldT = 0; } }
    const th = (a.thorns || 0) + bm('thorns'); if (th > 0 && fo && !fo.dead && n > 0 && Foe.dot) { const r = Math.max(1, Math.round(n * th / 100)); Foe.dot(fo, r); }
    n = Math.round(n);
    if (a.undy && S.hp - n <= 0 && t >= (M.undyAt || 0)) { M.undyAt = t + (a.undy >= 3 ? 60 : a.undy === 2 ? 80 : 100); n = Math.max(0, S.hp - 1); healP(25); if (W) { W.dodgeT = t + 2; W.dodgeAt = t - 1; } toast('✝️ 不屈！', '#ffe0a0', 1.4); ring(plPos(), '#ffe0a0', 0.5, 4, 0.7, plPos().y); flashS('#ffe0a0', 0.4, 400); }
    return n;
  }

  // ================= 事件（worlds.foeEvent0）=================
  function onEvent(t, fo, d) {
    if (!on()) return; const a = agg(), g = G0(), s = g.st(), tm = nowS();
    if (t === 'hit') {
      d = d || {}; M.combat = 6; if (fo) { M.target = fo; M.tgtT = tm; }
      if (!d.skill && !d.proc) addMana(2.5 + s.soul * 0.03);
      const lk = (a.leech || 0) + bm('leech'); if (lk > 0) healP(lk * (d.skill ? 0.6 : 1));
      if (d.spell && a.siphon) { addMana(a.siphon); }
      if (fo && !fo.dead) {
        const dn = d.dealt || 0;
        if (a.bleedHit && Math.random() * 100 < a.bleedHit) dot(fo, 'bleed', dn * 0.15, 4);
        if (d.crit && a.bleedCrit) dot(fo, 'bleed', dn * a.bleedCrit / 100 / 4, 4);
        if (hasB('poison')) dot(fo, 'poison', dn * 0.28 * (1 + (a.venom || 0) / 100), 5, 5);
      }
      if (d.crit) { if (a.flow) cutCds(a.flow); if (a.bmaster && !d.proc && fo && !fo.dead && Math.random() < 0.35) later(0.12, () => { if (!fo.dead) hitFoe(fo, 0.6, { proc: true, fx: false }); }); }
      return;
    }
    if (t === 'parry' || t === 'guard') { if (a.guard) { healP(a.guard); addMana(6); } if (t === 'parry' && a.parry) setFlag('nextCrit', 4, '🤺', '见切', '#ffe070'); addMana(t === 'parry' ? 8 : 3); }
    if (t === 'perfectdodge') { if (a.parry) setFlag('nextCrit', 4, '🤺', '见切', '#ffe070'); if (a.evadeM) { buff('evade', 6, { ic: '🦊', n: '闪避大师', col: '#b8a0ff', m: { crit: a.evadeM } }); try { if (window.Combat && Combat.state) Combat.state.stam = Math.min(100, Combat.state.stam + 30); } catch (e) { } } }
    if (t === 'dodge' || t === 'perfectdodge') { if (a.shade) setFlag('nextShade', 5, '🌑', '暗影', '#b8a0ff'); }
    if (['execute', 'decap', 'onecut', 'decapAlive'].includes(t) && fo && !fo._hm) { fo._hm = 1; if (a.hmaster) { healP(20); cutCdsP(0.25); toast('🏆 首级大师', '#ffd060', 0.9); } }
    if (t === 'kill' && fo && !fo._kd) {
      fo._kd = 1; if (a.killHeal) healP(a.killHeal); addMana(10 + (a.killMana || 0) + (a.killHeal ? 15 : 0));
      if (a.frenzy) buff('frenzy', 5, { ic: '🌪️', n: '血狂', col: '#ff8a5a', m: { dmg: 30, move: 20 } });
      if (a.lootHeal && Math.random() * 100 < a.lootHeal) { healP(15); toast('🍖 血肉：回复 15% 生命', '#ffa0a0', 0.9); }
    }
  }
  function rewardMul(fo) {
    if (!on()) return { c: 1, x: 1 }; const a = agg(), s = G0().st(); let b = 1; if ((fo && fo.bounty) || bm('bounty') || hasB('bounty')) b = 2;
    return { c: (1 + (a.coin || 0) / 100) * b, x: (1 + (a.xp || 0) / 100) * b };
  }
  const moveMul = () => { if (!on()) return 1; return 1 + ((agg().move || 0) + bm('move')) / 100; };

  // ================= 输出伤害（foe.hit 钩子）=================
  function outDmg(fo, info, dealt, zone, brk) {
    if (!on()) return dealt; const g = G0(), s = g.st(), S = g.S, a = agg(), W = WW(), tm = nowS(); let add = (a.dmg || 0) + s.str * 0.4 + bm('dmg');
    const hpf = S.hp / Math.max(1, s.maxHp); if (hpf < 0.5) add += a.lowDmg || 0; if (a.lostDmg) add += a.lostDmg * Math.floor((1 - hpf) * 10);
    const fr = fo.hp / Math.max(1, fo.maxHp); if (fr < 0.5) add += a.wound || 0; if (fr < 0.25) add += a.exec || 0;
    if (zone === 'head' || zone === 'neck') add += a.zone || 0; if (fo.boss || fo.elite) add += (a.elite || 0) + s.ter * 0.3;
    if (W && W.stats) { if (a.combo) add += a.combo * Math.min(15, W.stats.combo || 0); if (a.chain) add += a.chain * Math.min(5, (W.stats.kills || []).filter(x => tm - x < 8).length); }
    let m = 1 + add / 100, crit = !!info.crit;
    // 背刺：敌人背对你
    const P = plPos(); const face = Math.atan2(P.x - fo.pos.x, P.z - fo.pos.z), behind = Math.abs(ang(face - (fo.yaw || 0))) > 2.0;
    if (info.back || behind) { const bk = (a.back || 0) + (info.back ? 30 : 0); if (bk) m *= 1 + bk / 100; }
    if (info.skill) m *= 1 + s.soul * 0.012; if (info.spell) m *= 1 + (a.spell || 0) / 100;
    if (a.mmaster && info.skill && M.mana / maxMana() > 0.8) m *= 1.25; if (info.over) m *= 1.5;
    if (fo.mark) m *= 1 + fo.mark.k;
    if (!info.proc) { if (flag('nextBack')) { m *= 1.6; crit = true; eatFlag('nextBack'); } if (flag('nextShade')) { m *= 1.5; crit = true; eatFlag('nextShade'); } if (flag('nextCrit')) { m *= 1 + (a.parry || 0) / 100; crit = true; eatFlag('nextCrit'); } }
    const cc = (s.crit || 5) + bm('crit'); if (!crit && Math.random() * 100 < cc) crit = true;
    if (crit) { m *= (s.critD || 150) / 100; info.crit = true; }
    return Math.max(1, Math.round(dealt * m));
  }

  // ================= 每帧 =================
  let lastW = null, lastT = 0;
  function frame(dt) {
    if (!on() || !G0() || !G0().S) return; dt = Math.min(dt || 0.016, 0.1); const W = WW(), t = nowS();
    if (W !== lastW) { lastW = W; M.buffs = {}; M.shield = 0; PR.length = 0; ZN.length = 0; TM.length = 0; for (const f of FX) f.m.parent && f.m.parent.remove(f.m); FX.length = 0; M.target = null; M.cds = {}; if (W) M.mana = Math.max(M.mana, maxMana() * 0.5); }
    const s = G0().st(); const mx = s.manaMax || 60; M.mana = clamp(M.mana + (s.manaReg || 2) * dt * (M.combat > 0 ? 1 : 1.5), 0, mx); if (M.mana > mx) M.mana = mx;
    if (M.combat > 0) M.combat -= dt;
    if (!W) { M.eat.length = 0; return; }
    for (const id in M.buffs) { const b = M.buffs[id]; b.t -= dt; if (b.t <= 0) delete M.buffs[id]; }
    if (M.shield > 0) { M.shieldT -= dt; if (M.shieldT <= 0) M.shield = 0; }
    for (const e of M.eat) delete M.buffs[e]; M.eat.length = 0;
    for (let i = TM.length - 1; i >= 0; i--) { TM[i].t -= dt; if (TM[i].t <= 0) { const f = TM[i].fn; TM.splice(i, 1); try { f(); } catch (e) { console.warn('Talents timer', e); } } }
    prFrame(dt); zFrame(dt); fxFrame(dt); dotFrame(dt);
    const rg = (s.regenP || 0) + bm('regen'); if (rg > 0 && !W.dead && G0().S.hp > 0) heal(s.maxHp * rg / 100 * dt);
    if (M.target && (M.target.dead || t - M.tgtT > 6)) M.target = null;
    const af = aimFoeLite(); if (af) { M.target = af; M.tgtT = t; }
  }
  function aimFoeLite() { const W = WW(); if (!W || !window.Foe || !Foe.foes.length) return null; try { return aimFoe(22, 0.12); } catch (e) { return null; } }

  // ================= 按键 =================
  const DIG = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6, Digit8: 7, Digit9: 8, Digit0: 9 };
  const LEGACY = { KeyR: 'r_roar', KeyG: 'b_whirl' };
  function onKey(e) {
    if (!on() || !G0() || !G0().playing) return false; const W = WW(); if (!W || G0().uiOpen || W.busy || W.dead || W.mapOpen) return false;
    if (e.repeat) return e.code in DIG || e.code === 'KeyQ' || e.code in LEGACY;
    if (e.code in DIG) { const i = DIG[e.code] + (e.shiftKey ? 10 : 0); const id = tal().bar[i]; if (id) cast(id); else toast('这一格还是空的——按 T 打开技能书，把技能拖进来', '#aaa', 1); return true; }
    if (e.code === 'KeyQ') { cast('dodge'); return true; }
    if (e.code in LEGACY) { const id = LEGACY[e.code]; if (known(id)) cast(id); else toast(`🔒 「${D.SK[id].n}」要在天赋里学`, '#aaa', 1); return true; }
    return false;
  }
  addEventListener('keydown', e => { try { if (onKey(e)) { e.preventDefault(); e.stopImmediatePropagation(); } } catch (er) { console.warn('Talents key', er); } }, true);

  function onLevel(up) { if (!on()) return; const p = pts(); toast(`⬆️ Lv.${up.to}：属性点 +${3 * (up.to - up.from)} · 技能点 +${up.to - up.from}（按 T 分配）`, '#ffd27a', 4); if (window.TalUI && TalUI.pulse) TalUI.pulse(); void p; }
  function view() { return { M, buffs: M.buffs, mana: M.mana, maxMana: maxMana(), cds: M.cds, target: M.target, shield: M.shield }; }
  function cdLeft(id) { return Math.max(0, (M.cds[id] || 0) - nowS()); }
  function slotInfo(id) { const sk = D.SK[id]; if (!sk) return null; const l = cdLeft(id), tot = sk.cd * (1 - cdr()); return { sk, left: l, tot, frac: tot > 0 ? clamp(l / tot, 0, 1) : 0, ok: sk.cost <= M.mana + 0.01, cost: sk.cost }; }

  const wait = setInterval(() => { if (window.G && G.HOOK && G.S && window.RPG) { clearInterval(wait); G.HOOK.frame.push(dt => { try { frame(dt); } catch (e) { console.warn('Talents frame', e); } }); } }, 200);
  return { D, on, tal, lv, need, pts, spent, left, rank, known, agg, canRank, alloc, undo, allocAttr, reset, resetCost, applyBuild, setSlot, autoPlace, bonus, post, cast, onEvent, onKey, onLevel, outDmg, inDmg, avoid, rewardMul, moveMul, frame, view, slotInfo, cdLeft, maxMana, addMana, heal, M, bm, hitFoe, dot, stun, slow, aimFoe, _S: S_ };
})();
