// R73 肉鸽深度（三个 MOD，默认开）。用户：「肉鸽，每局不一样，高级组合性，不要重复感；多做点技能」。
//  · omen73 本局预兆：每局随机 2 条「预兆」（16 选 2，改的是规则不是数值：无头之年 / 血之契 / 悬赏令 / 回响之刃 / 断罪 / 狂宴 / 赌徒之月 / 野火 / 回头草 / 双生之月 / 孤注 / 月镜……）。
//  · fusion73 双生祝福：祝福标签两两凑够（各 ≥2，含流派标签）就融合出新效果（17 种：雷遁 / 冰壁 / 处刑火 / 月影分身 / 血冰晶 / 等离子 / 魂甲 / 背刃 / 超导 / 熔炉 / 断头台 / 烟火 / 霜步 / 避雷针 / 沸血 / 血月 / 断头血宴）。
//  · moonart73 月之秘技：每局开局 3 选 1 一个月之秘技（按 X 释放，12 种：月镰回旋 / 血缚 / 霜棺 / 雷钉 / 月隐 / 断头铡 / 魂灯 / 月光阶 / 怨首 / 镜盾 / 星坠 / 链刃）；每打倒一位章节使徒再抉择一次（换新的或强化到 Lv3）。
window.Omen73 = (() => {
  'use strict';
  const M_ = k => !window.Mods || !Mods.on || Mods.on(k) !== false;
  const LP = () => (window.Loop && Loop.on && Loop.on() ? Loop : null);
  const RG = () => (window.Rogue && Rogue.on && Rogue.on() ? Rogue : null);
  const TL = () => (window.Talents && Talents.on && Talents.on() ? Talents : null);
  const Wd = () => (window.Worlds && Worlds.active ? Worlds._W : null);
  const now = () => performance.now() / 1000;
  const T = () => window.THREE;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (t, c, s) => { try { G.toast(t, c || '#e8d0ff', s || 2.6); } catch (e) { } };
  const strong = fo => !!(window.Foe && Foe.STRONG && Foe.STRONG(fo));
  const foes = () => ((window.Foe && Foe.foes) || []).filter(f => !f.dead && !f.escaped && f.pos);
  const near = (p, r) => foes().filter(f => Math.hypot(f.pos.x - p.x, f.pos.z - p.z) < r);
  const heal = k => { try { const s = G.st(); G.S.hp = Math.min(s.maxHp, G.S.hp + s.maxHp * k); } catch (e) { } };
  const hit = (fo, m, o) => { const TT = TL(); if (!TT || !fo || fo.dead) return; try { TT.hitFoe(fo, m, Object.assign({ fx: false }, o || {})); } catch (e) { } };
  const spark = (p, n, col) => { try { Foe.spark({ x: p.x, y: (p.y || 0) + 1, z: p.z }, n || 14, col); } catch (e) { } };
  const sfx = (k, v, p) => { try { SFX.play && SFX.play(k, v, p); } catch (e) { } };
  function R() { const L = LP(); return L ? L.R() : null; }
  function st() { const r = R(); if (!r) return null; if (!r.o73) { const pool = Object.keys(OM).filter(k => !OM[k].need || OM[k].need()).sort(() => Math.random() - 0.5); r.o73 = { om: pool.slice(0, 2), fu: [], art: null, alv: 1, ach: 1, cl: -1, aw: -1 }; setTimeout(() => { if (M_('omen73')) toast(`🔮 本局预兆：${r.o73.om.map(k => OM[k].ic + ' ' + OM[k].n).join(' · ')}（出发面板右侧可查看）`, '#d8c8ff', 5.5); if (M_('omen73') && r.o73.om.includes('moonfavor') && window.M73) try { M73.bump(20, '月之眷顾'); } catch (e) { } }, 6000); } return r.o73; }
  const has = k => { if (!M_('omen73')) return false; const s = st(); return !!(s && s.om.includes(k)); };

  // ================= 预兆 =================
  const OM = {
    glass: { ic: '🥀', n: '易碎之年', col: '#ff9ab8', d: '你和敌人造成的伤害都 +35%。' },
    headrage: { ic: '🪓', n: '无头之年', col: '#ff8a6a', d: '每次斩首叠一层「首级怒火」（伤害 +5%，最多 8 层，8 秒掉一层）；敌人生命 +12%。' },
    bloodpact: { ic: '🩸', n: '血之契', col: '#ff5a6a', d: '每次斩首回复 6% 生命；你受到的伤害 +10%。' },
    bounty: { ic: '💰', n: '悬赏令', col: '#ffd060', d: '每张图最强的 2 个普通敌人身上有悬赏（金环）：砍下她们的头 → 额外魂晶。' },
    storm: { ic: '🌧️', n: '急雨', col: '#9fd0ff', d: '敌人出手快 15%，但生命 −15%。' },
    silent: { ic: '🤐', n: '无声之年', col: '#b8b8c8', d: '敌人不再放特殊技能，但生命 +20%、伤害 +15%——纯拼刀。' },
    echo: { ic: '🔔', n: '回响之刃', col: '#c8a0ff', d: '你每第 5 次命中，0.25 秒后会再回响一刀（×0.6）。' },
    verdict: { ic: '⚖️', n: '断罪', col: '#ffe8a0', d: '完美格挡直接削掉出手者 12% 生命（强敌 6%）；但敌人伤害 +10%。' },
    feast: { ic: '🍷', n: '狂宴', col: '#ff7a9a', d: '6 秒内连续击杀叠「狂宴」（每层伤害 +8%，最多 5 层），每次击杀按层数回血。' },
    gamble: { ic: '🎲', n: '赌徒之月', col: '#e8c0ff', d: '每进一张图，随机抽一条只对这张图有效的规则（可能是好事也可能是坏事）。' },
    wildfire: { ic: '🔥', n: '野火', col: '#ffa040', d: '敌人倒下的地方烧起 3 米野火（4 秒），烧到别的敌人。' },
    moonfavor: { ic: '🌕', n: '月之眷顾', col: '#e8e0ff', d: '开局月蚀 +20；但每拿到一条月之线索、每破坏一处使徒布局，多一次祝福抉择。', need: () => !!window.M73 },
    vengeful: { ic: '🔙', n: '回头草', col: '#ffb080', d: '逃跑的敌人 10 秒后会红着眼杀回来（伤害 +30%）。' },
    twins: { ic: '👭', n: '双生之月', col: '#ffc0e0', d: '每张图的敌人两两都是姐妹——一个倒下，另一个会发狂。', need: () => !!window.H73 },
    allin: { ic: '🃏', n: '孤注', col: '#ff6a6a', d: '你的最大生命 −25%，伤害 +30%。' },
    mirror: { ic: '🪞', n: '月镜', col: '#c8e8ff', d: '完美闪避会把那一刀反射给出手的人（×1.2）。' }
  };
  // ================= 双生祝福 =================
  const FU = [
    { a: '血', b: '刃', n: '断头血宴', ic: '🩸', d: '斩首：回复 4% 生命，接下来 3 刀 ×1.2' },
    { a: '雷', b: '影', n: '雷遁', ic: '⚡', d: '完美闪避：闪电劈向 7 米内 3 个敌人（×0.8，眩晕 0.8 秒）' },
    { a: '霜', b: '铁', n: '冰壁', ic: '🧊', d: '完美格挡：冻住出手的人 1.5 秒；你 3 秒内受伤 −15%' },
    { a: '火', b: '刃', n: '处刑火', ic: '🔥', d: '按 E 处决：4 米爆炸（×1.0）并点燃' },
    { a: '魂', b: '影', n: '月影分身', ic: '🌘', d: '完美闪避：原地留下分身，1 秒后炸开（3 米 ×1.2）' },
    { a: '血', b: '霜', n: '血冰晶', ic: '💎', d: '杀死冻住的敌人：冰晶飞向 3 个附近敌人（×0.5）并冻住她们' },
    { a: '雷', b: '火', n: '等离子', ic: '🌩️', d: '蓄力重击：电弧跳向 3 个敌人（×0.5）' },
    { a: '魂', b: '铁', n: '魂甲', ic: '🔮', d: '暴击：下一次受到的伤害 −50%' },
    { a: '刃', b: '影', n: '背刃', ic: '🗡️', d: '砍背对你 / 没发现你的敌人 ×1.4' },
    { a: '霜', b: '雷', n: '超导', ic: '❄️', d: '命中冻住的敌人：15% 眩晕 1.2 秒' },
    { a: '火', b: '铁', n: '熔炉', ic: '🌋', d: '格挡住的刀：出手的人被灼烧（3 秒）' },
    { a: '血', b: '魂', n: '血月', ic: '🌑', d: '生命低于 40% 时：暴击回复 3% 生命，暴击率 +10%' },
    { a: '铁', b: '刃', n: '断头台', ic: '⚔️', d: '完美格挡后，下一刀砍头 / 脖子 ×2.5' },
    { a: '火', b: '影', n: '烟火', ic: '🎆', d: '闪身：身后留下两团火（3 秒），烧到踩进去的敌人' },
    { a: '霜', b: '影', n: '霜步', ic: '🌨️', d: '闪身：3 米内敌人被冻住并减速' },
    { a: '雷', b: '铁', n: '避雷针', ic: '🔩', d: '受击：30% 落雷劈回出手的人（×0.8）' },
    { a: '血', b: '雷', n: '沸血', ic: '💥', d: '命中流血的敌人：20% 血液沸腾爆开（×0.6）' }
  ];
  const fkey = f => f.a + f.b;
  function fusions() { const Rg = RG(); if (!Rg || !M_('fusion73')) return []; let tc = {}; try { tc = Rg.tagCount(); } catch (e) { } return FU.filter(f => (tc[f.a] || 0) >= 2 && (tc[f.b] || 0) >= 2); }
  let fuC = { t: 0, v: [] }; const fu = k => { const t = now(); if (t - fuC.t > 1) { fuC.t = t; fuC.v = fusions().map(fkey); } return fuC.v.includes(k); };
  // ================= 月之秘技 =================
  const ART = {
    sickle: { n: '月镰回旋', ic: '🌙', col: '#d8d0ff', cd: 9, d: '掷出月镰，飞出 12 米再飞回来，去回各砍一次（×1.0）；回程砍脖子：生命 ≤30% 的普通敌人直接斩首。' },
    bind: { n: '血缚', ic: '🩸', col: '#ff5a6a', cd: 14, d: '血线缚住准星目标 6 秒：每砍她一刀回复 1.5% 生命；她在缚中倒下，你回复 10%。' },
    coffin: { n: '霜棺', ic: '🧊', col: '#bfefff', cd: 16, d: '把准星目标冻进冰棺 2.5 秒，随后碎裂：3 米内其他敌人 ×1.6 并被冻住。' },
    nail: { n: '雷钉', ic: '⚡', col: '#8ad0ff', cd: 12, d: '雷钉钉在准星处，1.5 秒后落雷：4 米 ×1.4，眩晕 0.8 秒（先亮蓝圈）。' },
    veil: { n: '月隐', ic: '🌫️', col: '#9fe8b0', cd: 18, d: '3 秒隐身：15 米内的敌人跟丢你；隐身时的第一刀 ×2.5 必暴。' },
    guillotine: { n: '断头铡', ic: '🪓', col: '#ffe08a', cd: 20, d: '0.8 秒后巨铡落在准星处（1.8 米）：生命 ≤50% 的普通敌人直接斩首，其余 ×2.6。' },
    lantern: { n: '魂灯', ic: '🏮', col: '#ffb070', cd: 22, d: '立一盏魂灯 10 秒：6 米内敌人受到的伤害 +25%，你在灯下每秒 +3 魂能。' },
    moonstep: { n: '月光阶', ic: '✨', col: '#fff4c0', cd: 10, d: '向前闪 9 米（无敌）；穿过的敌人被月光标记，1.2 秒后各受 ×1.3 并流血。' },
    dread: { n: '怨首', ic: '💀', col: '#d07aff', cd: 20, d: '掷出一颗怨首，落地炸开 4 米：普通敌人吓破胆逃跑 3 秒，强敌硬直 1 秒。' },
    mirror: { n: '镜盾', ic: '🪞', col: '#c8e8ff', cd: 15, d: '1.5 秒镜面：这期间打你的每一刀都被反射回去（×1.2），你不受伤。' },
    starfall: { n: '星坠', ic: '☄️', col: '#ffa040', cd: 18, d: '准星周围 2 秒内落下 6 颗星（每颗 2 米 ×0.9，有预警圈）。' },
    chainblade: { n: '链刃', ic: '⛓️', col: '#e8b0ff', cd: 11, d: '链刃横扫正面 6 米 120°：把敌人拽到你面前，×0.9 并减速 2 秒。' }
  };
  const artOn = () => M_('moonart73') && !!TL() && !!LP();
  const lvK = () => { const s = st(); return 1 + 0.3 * (((s && s.alv) || 1) - 1); };
  const cdK = () => { const s = st(); return 1 - 0.15 * (((s && s.alv) || 1) - 1); };
  // ---- 小特效 ----
  const FX = []; let GEO = null;
  const geo = () => GEO || (GEO = { disc: new (T().CircleGeometry)(1, 36).rotateX(-Math.PI / 2), ring: new (T().RingGeometry)(0.85, 1, 48).rotateX(-Math.PI / 2), torus: new (T().TorusGeometry)(0.45, 0.06, 6, 24), orb: new (T().SphereGeometry)(1, 12, 10) });
  const mat = (col, op) => new (T().MeshBasicMaterial)({ color: col, transparent: true, opacity: op, depthWrite: false, blending: T().AdditiveBlending, side: T().DoubleSide, fog: false });
  function fx(g, col, op, pos, life, upd) { const W = Wd(); if (!W || !W.B) return null; const m = new (T().Mesh)(geo()[g], mat(col, op)); m.position.copy(pos); m.renderOrder = 4; W.B.sc.add(m); const e = { m, t: 0, life, upd, sc: W.B.sc }; FX.push(e); return e; }
  const H = (x, z) => { const W = Wd(); return W && W.B ? W.B.H(x, z) : 0; };
  const V = (x, y, z) => new (T().Vector3)(x, y, z);
  function ringFx(p, col, r0, r1, life) { return fx('ring', col, 0.8, V(p.x, H(p.x, p.z) + 0.08, p.z), life, (e, k) => { e.m.scale.setScalar(r0 + (r1 - r0) * k); e.m.material.opacity = 0.8 * (1 - k); }); }
  function discFx(p, col, r, life) { return fx('disc', col, 0.25, V(p.x, H(p.x, p.z) + 0.07, p.z), life, (e, k) => { e.m.scale.setScalar(r); e.m.material.opacity = 0.15 + 0.3 * Math.abs(Math.sin(k * 12)); }); }
  function orbFx(p, col, s, life) { return fx('orb', col, 0.9, V(p.x, (p.y || H(p.x, p.z)) + 1, p.z), life, (e, k) => { e.m.scale.setScalar(s * (0.4 + k)); e.m.material.opacity = 0.9 * (1 - k); }); }
  const TM = []; const later = (s, f) => TM.push({ t: s, f });
  function fxFrame(dt) { const W = Wd(); for (let i = FX.length - 1; i >= 0; i--) { const e = FX[i]; e.t += dt; const k = Math.min(1, e.t / e.life); if (!W || !W.B || e.sc !== W.B.sc || k >= 1) { if (e.m.parent) e.m.parent.remove(e.m); e.m.material.dispose(); FX.splice(i, 1); continue; } if (e.upd) e.upd(e, k); }
    for (let i = TM.length - 1; i >= 0; i--) { TM[i].t -= dt; if (TM[i].t <= 0) { const f = TM[i].f; TM.splice(i, 1); if (W) try { f(); } catch (e) { console.warn('omen73 timer', e); } } } }
  // ---- 施放 ----
  const P = () => Wd().pos;
  const fwd = () => { const y = G.player.yaw; return V(-Math.sin(y), 0, -Math.cos(y)); };
  const aimFoe = (r, c) => { try { return TL().aimFoe(r, c || 0.45); } catch (e) { return null; } };
  const aimPt = d => { const f = aimFoe(d, 0.35); if (f) return V(f.pos.x, 0, f.pos.z); const p = P(), v = fwd(); return V(p.x + v.x * d * 0.7, 0, p.z + v.z * d * 0.7); };
  const A = { cdUntil: 0, veil: 0, mirror: 0, lantern: null, proj: [] };
  const CAST = {
    sickle() { const p = P(), d = aimFoe(14) ? (() => { const f = aimFoe(14); const v = V(f.pos.x - p.x, 0, f.pos.z - p.z); return v.normalize(); })() : fwd(); const e = fx('torus', '#e8e0ff', 0.95, V(p.x, p.y + 1.1, p.z), 1.0, null); if (!e) return false; e.m.rotation.x = Math.PI / 2; const got0 = new Set(), got1 = new Set(), o = { x: p.x, z: p.z };
      e.upd = (E, k) => { const out = k < 0.5, q = out ? k * 2 : (1 - k) * 2, pp = out ? o : P(), x = pp.x + d.x * 12 * q, z = pp.z + d.z * 12 * q; E.m.position.set(x, H(x, z) + 1.1, z); E.m.rotation.z += 0.6; for (const f of near(E.m.position, 1.3)) { const g = out ? got0 : got1; if (g.has(f)) continue; g.add(f); if (!out && !strong(f) && f.hp <= f.maxHp * 0.3) { try { Foe.execute(f, V(f.pos.x - x, 0, f.pos.z - z)); } catch (er) { } } else hit(f, 1.0 * lvK(), out ? {} : { zone: 'neck', decapAt: 0.3 }); spark(f.pos, 10); } }; sfx('draw', 0.7, 1.6); },
    bind() { const f = aimFoe(16); if (!f) return toast('附近没有目标', '#ff9a7a', 0.8), false; f.bind73 = now() + 6 * lvK(); ringFx(f.pos, '#ff4a5a', 0.4, 1.6, 0.6); toast('🩸 血缚', '#ff7a8a', 0.9); sfx('bell', 0.4, 0.7); },
    coffin() { const f = aimFoe(14); if (!f) return toast('附近没有目标', '#ff9a7a', 0.8), false; try { TL().stun(f, 2.5); } catch (e) { } f._chill = now() + 4; const e = orbFx(f.pos, '#bfefff', 1.4, 2.5); if (e) e.upd = (E, k) => { E.m.position.set(f.pos.x, f.pos.y + 1, f.pos.z); E.m.scale.setScalar(1.1); E.m.material.opacity = 0.35 + 0.15 * Math.sin(k * 20); };
      later(2.5, () => { ringFx(f.pos, '#e0f8ff', 0.5, 3.2, 0.4); spark(f.pos, 30, 'blue'); hit(f, 1.0 * lvK()); for (const o of near(f.pos, 3)) if (o !== f) { hit(o, 1.6 * lvK()); o._chill = now() + 3; } sfx('bell', 0.6, 2.2); }); },
    nail() { const c = aimPt(16); discFx(c, '#6ab0ff', 4, 1.5); later(1.5, () => { ringFx(c, '#c8e8ff', 0.5, 4.2, 0.35); spark(c, 30, 'blue'); for (const f of near(c, 4)) { hit(f, 1.4 * lvK(), { stun: 0.8 }); } try { const W = Wd(); W.shake = Math.max(W.shake || 0, 0.4); } catch (e) { } sfx('thud', 0.9, 0.7); }); sfx('draw', 0.6, 2); },
    veil() { A.veil = now() + 3; for (const f of near(P(), 15)) { f.seen = false; f.atk = null; if (f.state === 'chase') f.state = 'idle'; } ringFx(P(), '#9fe8b0', 0.5, 3, 0.5); toast('🌫️ 月隐：她们跟丢了你', '#9fe8b0', 1.2); sfx('draw', 0.4, 0.5); },
    guillotine() { const c = aimPt(14); discFx(c, '#ffd060', 1.8, 0.8); const e = fx('torus', '#ffe8a0', 0.9, V(c.x, H(c.x, c.z) + 9, c.z), 0.8, (E, k) => { E.m.position.y = H(c.x, c.z) + 9 * (1 - k * k) + 0.6; E.m.scale.setScalar(2.4); }); void e;
      later(0.8, () => { ringFx(c, '#ffe8a0', 0.5, 2.2, 0.35); for (const f of near(c, 1.8)) { if (!strong(f) && f.hp <= f.maxHp * 0.5) { try { Foe.execute(f, V(f.pos.x - c.x + 0.01, 0, f.pos.z - c.z)); } catch (er) { } } else hit(f, 2.6 * lvK(), { zone: 'neck', decapAt: 0.2 }); } try { const W = Wd(); W.shake = Math.max(W.shake || 0, 0.5); } catch (er) { } sfx('thud', 1, 0.6); }); },
    lantern() { const c = P().clone(); A.lantern = { x: c.x, z: c.z, until: now() + 10 }; const e = orbFx(c, '#ffb070', 0.6, 10); if (e) e.upd = (E, k) => { E.m.position.set(c.x, H(c.x, c.z) + 1.6, c.z); E.m.scale.setScalar(0.45 + 0.05 * Math.sin(k * 60)); E.m.material.opacity = 0.85; }; const r = fx('ring', '#ffb070', 0.3, V(c.x, H(c.x, c.z) + 0.08, c.z), 10, (E) => { E.m.scale.setScalar(6); }); void r; sfx('bell', 0.4, 1.2); },
    moonstep() { const W = Wd(), d = fwd(), p = P().clone(), t = now(); const v = d.clone().multiplyScalar(9 / 0.18); W.vel.x = v.x; W.vel.z = v.z; W.dashT = 0.18; W.dashV = v; W.dodgeT = Math.max(W.dodgeT || 0, t + 0.3); W.dodgeAt = t - 1;
      for (const f of foes()) { const dx = f.pos.x - p.x, dz = f.pos.z - p.z, a = dx * d.x + dz * d.z, pd = Math.abs(dx * d.z - dz * d.x); if (a > -0.5 && a < 9.8 && pd < 1.5) { orbFx(f.pos, '#fff4c0', 0.8, 1.2); later(1.2, () => { hit(f, 1.3 * lvK()); try { TL().dot(f, 'bleed', f.maxHp * 0.03, 3); } catch (e) { } spark(f.pos, 12); }); } }
      for (let i = 0; i < 5; i++) orbFx(V(p.x + d.x * i * 2, p.y, p.z + d.z * i * 2), '#fff4c0', 0.7, 0.4); sfx('draw', 0.6, 1.8); },
    dread() { const c = aimPt(14), p = P(); const e = orbFx(p, '#d07aff', 0.5, 0.5); if (e) e.upd = (E, k) => { E.m.position.set(p.x + (c.x - p.x) * k, H(p.x, p.z) + 1.4 + Math.sin(k * Math.PI) * 2, p.z + (c.z - p.z) * k); E.m.scale.setScalar(0.35); };
      later(0.5, () => { ringFx(c, '#d07aff', 0.5, 4.2, 0.45); spark(c, 30); for (const f of near(c, 4)) { if (strong(f)) { try { TL().stun(f, 1); } catch (er) { } } else { f.fear73 = now() + 3 * lvK(); f.brave = false; f.state = 'flee'; f.atk = null; try { Foe.say(f, '鬼……有鬼！', '#e0c0ff'); } catch (er) { } } } sfx('roar', 0.4, 1.4); }); },
    mirror() { A.mirror = now() + 1.5 * lvK(); const e = orbFx(P(), '#c8e8ff', 1.8, 1.5 * lvK()); if (e) e.upd = (E, k) => { const p = P(); E.m.position.set(p.x, p.y + 1.1, p.z); E.m.scale.setScalar(1.3); E.m.material.opacity = 0.25 * (1 - k) + 0.1; }; sfx('bell', 0.6, 2.6); },
    starfall() { const c = aimPt(16); for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283, r = Math.random() * 3.5, x = c.x + Math.sin(a) * r, z = c.z + Math.cos(a) * r, q = V(x, 0, z), d0 = i * 0.33; later(d0, () => { discFx(q, '#ff8030', 2, 0.9); }); later(d0 + 0.9, () => { ringFx(q, '#ffb060', 0.5, 2.2, 0.3); spark(q, 16); for (const f of near(q, 2)) hit(f, 0.9 * lvK()); sfx('thud', 0.5, 1 + Math.random() * 0.5); }); } },
    chainblade() { const p = P().clone(), d = fwd(); let n = 0; for (const f of foes()) { const dx = f.pos.x - p.x, dz = f.pos.z - p.z, dd = Math.hypot(dx, dz); if (dd > 6 || dd < 0.3) continue; if ((dx * d.x + dz * d.z) / dd < 0.5) continue; n++; const k = Math.max(0, (dd - 1.8) / dd); if (!strong(f)) { f.pos.x -= dx * k; f.pos.z -= dz * k; } hit(f, 0.9 * lvK()); try { TL().slow(f, 0.6, 2); } catch (e) { } spark(f.pos, 8); }
      ringFx(V(p.x + d.x * 3, 0, p.z + d.z * 3), '#e8b0ff', 0.5, 3.2, 0.3); sfx('draw', 0.7, 0.8); if (!n) toast('⛓️ 正面没有人', '#c8a8d8', 0.8); }
  };
  function castArt() { const s = st(); if (!s || !s.art || !ART[s.art]) return; const W = Wd(); if (!W || W.busy || W.dead || G.uiOpen) return; const t = now(); if (A.cdUntil > t) { sfx('thud', 0.15, 2); return; }
    let ok; try { ok = CAST[s.art](); } catch (e) { console.warn('moonart', e); ok = false; } if (ok === false) return; A.cdUntil = t + ART[s.art].cd * cdK(); }

  // ================= 伤害 / 受伤包装 =================
  const B = { rage: 0, rageT: 0, feast: 0, feastT: 0, echo: 0, buffN: 0, guillo: 0, half: 0, dr: 0 };
  function outMul(fo, info, d, zone) {
    let m = 1; const t = now(), W = Wd();
    if (has('glass')) m *= 1.35; if (has('allin')) m *= 1.3; if (has('headrage') && B.rage) m *= 1 + 0.05 * B.rage; if (has('feast') && B.feast && t - B.feastT < 6) m *= 1 + 0.08 * B.feast;
    if (W && W.o73n && W.o73n.dmg) m *= W.o73n.dmg;
    if (A.lantern && A.lantern.until > t && Math.hypot(fo.pos.x - A.lantern.x, fo.pos.z - A.lantern.z) < 6) m *= 1.25;
    if (!info.proc) {
      if (A.veil > t) { m *= 2.5; info.crit = true; A.veil = 0; toast('🌫️ 月隐一击！', '#9fe8b0', 0.9); }
      if (B.buffN > 0 && fu('血刃')) { m *= 1.2; B.buffN--; }
      if (B.guillo && (zone === 'neck' || zone === 'head') && fu('铁刃')) { m *= 2.5; B.guillo = 0; toast('⚔️ 断头台！', '#ffe8a0', 0.9); }
      if (fu('刃影')) { const pp = W && W.pos; if (pp) { const face = Math.atan2(pp.x - fo.pos.x, pp.z - fo.pos.z), dd = Math.atan2(Math.sin(face - (fo.yaw || 0)), Math.cos(face - (fo.yaw || 0))); if (Math.abs(dd) > 2.0 || !fo.seen) m *= 1.4; } }
    }
    return Math.max(1, Math.round(d * m));
  }
  function inMul(fo, n) { const t = now(); let m = 1; if (has('glass')) m *= 1.35; if (has('bloodpact')) m *= 1.1; if (has('verdict')) m *= 1.1; if (B.half && fu('魂铁')) { m *= 0.5; B.half = 0; } if (B.dr > t) m *= 0.85;
    if (A.mirror > t && fo && !fo.hazard && !fo.dead) { hit(fo, 1.2 * lvK(), { proc: true }); spark(fo.pos, 14, 'blue'); return 0; }
    if (fu('雷铁') && fo && !fo.hazard && !fo.dead && Math.random() < 0.3) { hit(fo, 0.8, { proc: true }); spark(fo.pos, 12, 'blue'); }
    return Math.max(0, Math.round(n * m)); }
  // ================= 事件 =================
  let hitN = 0;
  function onEv(t, fo, d) {
    if (!fo || !Wd()) return; const tm = now(), s = st(); d = d || {};
    if (t === 'hit' && !d.proc) {
      if (has('echo') && !d.skill && ++hitN % 5 === 0) later(0.25, () => { if (!fo.dead) { hit(fo, 0.6, { proc: true }); spark(fo.pos, 10); } });
      if (fo.bind73 > tm) heal(0.015);
      if (fo._chill > tm && fu('霜雷') && Math.random() < 0.15) { try { TL().stun(fo, 1.2); } catch (e) { } spark(fo.pos, 12, 'blue'); }
      if (fo.tfx && fo.tfx.bleed && fu('血雷') && Math.random() < 0.2) { hit(fo, 0.6, { proc: true }); spark(fo.pos, 18); }
      if (d.charged && fu('雷火')) for (const f of near(fo.pos, 6).filter(x => x !== fo).slice(0, 3)) { hit(f, 0.5, { proc: true }); spark(f.pos, 10, 'blue'); }
      if (d.crit) { if (fu('魂铁')) B.half = 1; try { if (fu('血魂') && G.S.hp < G.st().maxHp * 0.4) heal(0.03); } catch (e) { } }
    }
    if (t === 'decap') { if (has('headrage')) { B.rage = Math.min(8, B.rage + 1); B.rageT = tm; } if (has('bloodpact')) heal(0.06); if (fu('血刃')) { heal(0.04); B.buffN = 3; }
      if (has('bounty') && fo.bounty73) { fo.bounty73 = 0; const c = Math.round(30 * (1 + 0.3 * ((R() && R().chap) || 1))); try { G.addCoins(c); const W = Wd(); if (W && W.trip) W.trip.coins += c; } catch (e) { } toast(`💰 悬赏到手 +${c} 🔮`, '#ffd060', 2); } }
    if (t === 'kill') { if (fo.bind73 > tm) heal(0.1); if (has('feast')) { B.feast = tm - B.feastT < 6 ? Math.min(5, B.feast + 1) : 1; B.feastT = tm; heal(0.01 * B.feast); }
      if (has('wildfire')) { const c = V(fo.pos.x, 0, fo.pos.z); discFx(c, '#ff7020', 3, 4); for (let i = 1; i <= 8; i++) later(i * 0.5, () => { for (const f of near(c, 3)) { try { Foe.dot(f, Math.max(1, Math.round(f.maxHp * 0.025))); } catch (e) { } } }); }
      if (fo._chill > tm && fu('血霜')) for (const f of near(fo.pos, 6).slice(0, 3)) { hit(f, 0.5, { proc: true }); f._chill = tm + 3; spark(f.pos, 10, 'blue'); } }
    if (t === 'execute' && fu('火刃')) { ringFx(fo.pos, '#ff8030', 0.5, 4, 0.4); for (const f of near(fo.pos, 4)) if (f !== fo) { hit(f, 1.0, { proc: true }); try { TL().dot(f, 'burn', f.maxHp * 0.03, 3); } catch (e) { } } }
    if (t === 'parry') { if (has('verdict') && !fo.hazard) { try { Foe.dot(fo, Math.max(1, Math.round(fo.maxHp * (strong(fo) ? 0.06 : 0.12)))); } catch (e) { } toast('⚖️ 断罪', '#ffe8a0', 0.8); } if (fu('霜铁')) { try { TL().stun(fo, 1.5); } catch (e) { } fo._chill = tm + 3; B.dr = tm + 3; } if (fu('铁刃')) B.guillo = 1; }
    if (t === 'guard' && fu('火铁') && !fo.hazard) { try { TL().dot(fo, 'burn', fo.maxHp * 0.025, 3); } catch (e) { } }
    if (t === 'perfectdodge' && !fo.hazard) { if (has('mirror')) { hit(fo, 1.2, { proc: true }); spark(fo.pos, 16, 'blue'); }
      if (fu('雷影')) for (const f of near(P(), 7).slice(0, 3)) { hit(f, 0.8, { proc: true, stun: 0.8 }); spark(f.pos, 12, 'blue'); }
      if (fu('魂影')) { const c = P().clone(); orbFx(c, '#b8a0ff', 1.2, 1); later(1, () => { ringFx(c, '#b8a0ff', 0.5, 3, 0.35); for (const f of near(c, 3)) hit(f, 1.2, { proc: true }); }); } }
    if ((t === 'dodge' || t === 'perfectdodge')) { const p = P().clone(); if (fu('火影')) { discFx(p, '#ff7020', 1.2, 3); for (let i = 1; i <= 6; i++) later(i * 0.5, () => { for (const f of near(p, 1.4)) try { Foe.dot(f, Math.max(1, Math.round(f.maxHp * 0.02))); } catch (e) { } }); }
      if (fu('霜影')) for (const f of near(p, 3)) { f._chill = tm + 3; try { TL().slow(f, 0.6, 2); } catch (e) { } } }
  }
  // ================= 每帧 / 每张图 =================
  let lastB = null, lastW = null;
  const GAMBLE = [{ n: '🎲 这张图：你的伤害 +30%', dmg: 1.3 }, { n: '🎲 这张图：你的伤害 −15%……但敌人都慢了', dmg: 0.85, slow: 1 }, { n: '🎲 这张图：敌人更快了', fast: 1 }, { n: '🎲 这张图：月光为你回复了 25% 生命', heal: 0.25 }, { n: '🎲 这张图：诅咒——失去 10% 生命', hurt: 0.1 }, { n: '🎲 这张图：敌人生命 +20%，但每次击杀回复 4%', ehp: 1.2, kh: 1 }];
  function nodeEnter(W) { W.o73n = {}; if (has('gamble')) { const g = GAMBLE[Math.floor(Math.random() * GAMBLE.length)]; W.o73n = Object.assign({}, g); setTimeout(() => toast(g.n, '#e8c0ff', 3.4), 2500); if (g.heal) heal(g.heal); if (g.hurt) try { G.S.hp = Math.max(1, G.S.hp - G.st().maxHp * g.hurt); } catch (e) { } }
    W.o73at = now() + 3; }
  function spawnTune(fo, W) { fo.o73 = 1; if (has('headrage')) fo.maxHp = fo.hp = Math.round(fo.maxHp * 1.12); if (has('storm')) fo.maxHp = fo.hp = Math.round(fo.maxHp * 0.85); if (has('silent')) { fo.maxHp = fo.hp = Math.round(fo.maxHp * 1.2); fo.dmgMul = (fo.dmgMul || 1) * 1.15; }
    const n = W.o73n || {}; if (n.ehp) fo.maxHp = fo.hp = Math.round(fo.maxHp * n.ehp); if (n.slow) fo.spdMul = (fo.spdMul || 1) * 0.85; if (n.fast) fo.spdMul = (fo.spdMul || 1) * 1.15; }
  let chip = null, chipSig = '', chipAt = 0;
  function frame(dt) {
    const W = Wd(); fxFrame(dt); if (!W) { if (chip) chip.style.display = 'none'; return; } if (!LP()) return; const s = st(); if (!s) return; const t = now();
    if (W !== lastW) { lastW = W; A.cdUntil = 0; A.lantern = null; B.rage = 0; B.feast = 0; } if (W.B !== lastB && W.B) { lastB = W.B; nodeEnter(W); }
    if (B.rage && t - B.rageT > 8) { B.rage--; B.rageT = t; }
    for (const fo of foes()) { if (!fo.o73) spawnTune(fo, W);
      if (has('silent')) fo.skCd = Math.max(fo.skCd || 0, 4);
      if (has('storm') && fo.atk && !fo.atk._o73) { fo.atk._o73 = 1; fo.atk.ws = Math.min(1.2, fo.atk.ws * 1.15); }
      if (fo.fear73 > t) { fo.brave = false; fo.state = 'flee'; fo.atk = null; }
      if (has('vengeful') && !strong(fo)) { if (fo.state === 'flee' && !fo.fear73) { fo.fl73 = fo.fl73 || t; if (t - fo.fl73 > 10 && !fo.back73) { fo.back73 = 1; fo.brave = true; fo.state = 'chase'; fo.flee73 = 0; fo.dmgMul = (fo.dmgMul || 1) * 1.3; try { Foe.say(fo, '我……我回来了！', '#ff9a8a'); } catch (e) { } } } else if (fo.state !== 'flee') fo.fl73 = 0; }
      if (A.veil > t && fo.state === 'chase' && Math.hypot(fo.pos.x - W.pos.x, fo.pos.z - W.pos.z) < 15) { fo.state = 'idle'; fo.seen = false; fo.atk = null; } }
    if (W.o73at && t > W.o73at && !W.busy) { W.o73at = 0;
      if (has('bounty')) { const L = foes().filter(f => !strong(f)).sort((a, b) => ((b.tier | 0) * 10 + (b.rar | 0)) - ((a.tier | 0) * 10 + (a.rar | 0))).slice(0, 2); for (const f of L) { f.bounty73 = 1; const e = fx('ring', '#ffd060', 0.5, V(f.pos.x, 0, f.pos.z), 600, (E) => { if (f.dead) { E.t = E.life; return; } E.m.position.set(f.pos.x, H(f.pos.x, f.pos.z) + 0.08, f.pos.z); E.m.scale.setScalar(0.7); }); void e; } if (L.length) toast(`💰 悬赏：${L.map(f => (f.h && f.h.c && f.h.c.name) || '某人').join('、')}（金环）`, '#ffd060', 2.6); }
      if (has('twins')) { const L = foes().filter(f => !strong(f) && !f.bond73).sort(() => Math.random() - 0.5); for (let i = 0; i + 1 < L.length; i += 2) { L[i].bond73 = { o: L[i + 1], k: 'sis', me: 'a' }; L[i + 1].bond73 = { o: L[i], k: 'sis', me: 'b' }; L[i].b73 = L[i + 1].b73 = 1; } } }
    if (W.o73n && W.o73n.kh) { /* 赌徒：击杀回血在 onEv 里不好区分，这里用击杀数差值 */ const k = (W.stats && W.stats.kill) || 0; if (W.o73k == null) W.o73k = k; if (k > W.o73k) { heal(0.04 * (k - W.o73k)); W.o73k = k; } }
    if (has('moonfavor') && window.M73) { const cn = (window.Saga && Saga.clues) ? Saga.clues() : 0, aw = window.Apostle73 && Apostle73.status() ? Apostle73.status().wins : 0; if (s.cl < 0) s.cl = cn; if (s.aw < 0) s.aw = aw; const g = (cn - s.cl) + Math.max(0, aw - s.aw); if (g > 0) { try { RG() && RG().grant(g, '月之眷顾'); } catch (e) { } } s.cl = cn; s.aw = aw; }
    if (t - chipAt > 0.1) { chipAt = t; artChip(s, t); }
  }
  function artChip(s, t) { if (!artOn() || !s.art) { if (chip) chip.style.display = 'none'; return; } if (!chip) { chip = document.createElement('div'); chip.id = 'o73chip'; chip.style.cssText = 'position:fixed;right:14px;bottom:92px;z-index:29;pointer-events:none;padding:5px 12px;background:rgba(14,10,24,.8);border:1px solid rgba(200,180,255,.45);border-left:3px solid #c8b8ff;color:#efe8ff;font:600 13px/1.4 "Microsoft YaHei UI",system-ui,sans-serif;text-shadow:0 1px 2px #000'; document.body.appendChild(chip); }
    const a = ART[s.art], l = Math.max(0, A.cdUntil - t), sig = s.art + s.alv + (l > 0 ? Math.ceil(l * 10) : 'r'); chip.style.display = document.body.classList.contains('sgcine') ? 'none' : 'block'; if (sig === chipSig) return; chipSig = sig;
    chip.innerHTML = `<b style="display:inline-block;min-width:18px;padding:0 4px;margin-right:6px;border:1px solid #c8b8ff;border-bottom-width:2px;border-radius:3px;text-align:center">X</b>${a.ic} ${esc(a.n)} <small style="color:#c8b8ff">Lv${s.alv}</small> · ${l > 0 ? `<span style="color:#a898c8">${l.toFixed(1)}s</span>` : '<span style="color:#9fe89f">就绪</span>'}`; }
  // ================= 抉择：月之秘技 =================
  const GU = () => !!(window.GrandUI && GrandUI.on && GrandUI.on());
  function pickHost() { const h = document.querySelector('.rq-pick') || document.querySelector('.locs'); return !!(h && h.offsetParent) && !Wd(); }
  function offer(n, excl) { return Object.keys(ART).filter(k => !excl.includes(k)).sort(() => Math.random() - 0.5).slice(0, n); }
  function choose() { if (!artOn() || !GU() || GrandUI.isOpen() || !pickHost()) return; const s = st(), r = R(); if (!s) return; const need = !s.art || s.ach < r.chap; if (!need) return;
    const first = !s.art, ks = first ? offer(3, []) : offer(2, [s.art]); const cards = ks.map(k => ({ k, ic: ART[k].ic, col: ART[k].col, name: ART[k].n, epi: first ? '月之秘技' : '换成它', rib: 'X 键', html: esc(ART[k].d) + `<br><br><small>冷却 ${ART[k].cd} 秒</small>` }));
    if (!first && s.alv < 3) cards.push({ k: '_up', ic: ART[s.art].ic, col: '#ffe28a', name: `强化「${ART[s.art].n}」`, epi: `Lv${s.alv} → Lv${s.alv + 1}`, rib: '强化', html: '伤害 +30%，冷却 −15%' });
    GrandUI.choose({ kicker: first ? '新 的 一 局 · 月 之 秘 技' : `第 ${r.chap} 章 · 月 之 秘 技`, title: first ? '月光借给你一招' : '使徒倒下，月光又借给你一招', sub: '野外按 <b>X</b> 释放。每打倒一位章节使徒，可以换一招或把现在这招强化（最高 Lv3）。', cards: cards.slice(0, 3), later: first ? null : '保持不变',
      onPick: k => { if (k === '_up') s.alv = Math.min(3, s.alv + 1); else { s.art = k; s.alv = 1; } s.ach = r.chap; toast(`🌙 月之秘技：${ART[s.art].ic} ${ART[s.art].n} Lv${s.alv}——野外按 X`, ART[s.art].col, 3.4); try { G.save(); } catch (e) { } }, onLater: () => { s.ach = r.chap; } }); }
  // ================= 选地点右侧面板 =================
  function sideAug() { const el = document.getElementById('lpSide'); if (!el || el.querySelector('.o73s') || !LP()) return; const s = st(); if (!s) return; const parts = [];
    if (M_('omen73')) parts.push(`<h4>🔮 本局预兆</h4>${s.om.map(k => `<p><b style="color:${OM[k].col}">${OM[k].ic} ${OM[k].n}</b> <span class="m">${esc(OM[k].d)}</span></p>`).join('')}`);
    if (M_('fusion73') && RG()) { const act = fusions(); let tc = {}; try { tc = RG().tagCount(); } catch (e) { } const nx = FU.filter(f => !act.includes(f) && (tc[f.a] || 0) + (tc[f.b] || 0) >= 2 && Math.min(tc[f.a] || 0, tc[f.b] || 0) >= 1).slice(0, 3);
      parts.push(`<h4>✨ 双生祝福 <small>两种标签各 ≥2 自动融合</small></h4>${act.length ? act.map(f => `<p><b style="color:#ffe28a">${f.ic} ${f.n}</b>（${f.a}+${f.b}）<span class="m">${esc(f.d)}</span></p>`).join('') : '<p class="m">还没有融合。</p>'}${nx.length ? `<p class="m">快成了：${nx.map(f => `${f.ic}${f.n}（${f.a}${tc[f.a] || 0}/2 + ${f.b}${tc[f.b] || 0}/2）`).join(' · ')}</p>` : ''}`); }
    if (artOn() && s.art) parts.push(`<h4>🌙 月之秘技 <small>野外按 X</small></h4><p><b style="color:${ART[s.art].col}">${ART[s.art].ic} ${ART[s.art].n} Lv${s.alv}</b> <span class="m">${esc(ART[s.art].d)}</span></p>`);
    if (!parts.length) return; const sec = document.createElement('section'); sec.className = 'o73s'; sec.dataset.ord = 3; sec.style.setProperty('--bc', '#c8a0ff'); sec.innerHTML = parts.join(''); el.appendChild(sec); try { R73.sortSide(el); } catch (e) { } }
  let fuSeen = null;
  setInterval(() => { try { if (!LP() || !window.G || !G.S) return; sideAug(); choose(); if (M_('fusion73') && RG()) { const k = fusions().map(fkey).join(','); if (fuSeen === null) fuSeen = k; else if (k !== fuSeen) { const old = fuSeen.split(','); for (const f of fusions()) if (!old.includes(fkey(f))) toast(`✨ 双生祝福融合：${f.ic} ${f.n}（${f.a}+${f.b}）——${f.d}`, '#ffe28a', 5); fuSeen = k; } } } catch (e) { } }, 500);
  // ================= 接线 =================
  addEventListener('keydown', e => { if (e.code !== 'KeyX' || e.repeat || !artOn()) return; const W = Wd(); if (!W || !window.G || !G.playing || G.uiOpen) return; const s = st(); if (!s || !s.art) return; e.preventDefault(); e.stopImmediatePropagation(); castArt(); }, true);
  let wired = false;
  function wire() { if (wired || !window.G || !G.HOOK || !window.R73 || !window.Rogue || !window.RPG) return false; wired = true; G.HOOK.world = G.HOOK.world || []; G.HOOK.world.push(frame); R73.on(onEv);
    const o0 = Rogue.outDmg; Rogue.outDmg = function (fo, info) { let d = o0.apply(this, arguments); try { if (LP() && fo && isFinite(d)) d = outMul(fo, info || {}, d, arguments[3]); } catch (e) { } return d; };
    const i0 = Rogue.inDmg; Rogue.inDmg = function (fo, n) { let v = i0.apply(this, arguments); try { if (LP() && isFinite(v)) v = inMul(fo, v); } catch (e) { } return v; };
    if (RPG.stats && !RPG.stats.__o73) { const s0 = RPG.stats; RPG.stats = function () { const r = s0.apply(this, arguments); try { if (r && r.maxHp && has('allin')) r.maxHp = Math.round(r.maxHp * 0.75); } catch (e) { } return r; }; RPG.stats.__o73 = 1; }
    try { const r = R(); if (r && !r.o73) st(); } catch (e) { } return true; }
  if (!wire()) { const iv = setInterval(() => { if (wire()) clearInterval(iv); }, 400); }
  return { OM, FU, ART, st, has, fusions, castArt, outMul, inMul, CAST, A };
})();
