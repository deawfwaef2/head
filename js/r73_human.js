// R73 MOD foe_bonds（默认开）：敌人有人情味——队长、姐妹/恋人/师徒/战友、目击者会记仇。用户：「敌人缺少人性和故事」。
//  · 每张图里：人数 ≥3 时最强的那个是「队长」；相距不远的人两两结成关系（姐妹 / 恋人 / 师徒 / 战友）。
//  · 关系里一方倒下，另一方会有反应：姐妹暴怒（伤害 +25%、更快）· 恋人可能崩溃跪地（3 秒破绽）或拼命 · 徒弟逃跑（逃掉 = 复仇宿敌）· 师父 / 战友暴怒。
//  · 队长倒下：附近的人士气崩溃——有的逃跑，有的红着眼冲上来。
//  · 目击者：你砍头时 14 米内看见的人会记住；她要是逃掉了，就成为新的宿敌（带「复仇者」特质）。
//  · 名牌：准星对准 14 米内的敌人约 0.3 秒，头顶显示 名字 · 称号 · 关系 · 一句来历。
window.H73 = (() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('foe_bonds') !== false;
  const Wd = () => (window.Worlds && Worlds.active ? Worlds._W : null);
  const now = () => performance.now() / 1000;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (t, c, s) => { try { G.toast(t, c || '#ffd8c0', s || 2.4); } catch (e) { } };
  const say = (fo, s, col) => { try { Foe.say(fo, s, col || '#ffd0c0'); } catch (e) { } };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const strong = fo => !!(window.Foe && Foe.STRONG && Foe.STRONG(fo));
  const NM = fo => (fo && fo.h && fo.h.c && fo.h.c.name) || '她';
  const REL = {
    sis: { n: '姐妹', a: '姐姐', b: '妹妹', die: ['姐姐——！！', '不……妹妹！', '我要你偿命！！'] },
    love: { n: '恋人', a: '恋人', b: '恋人', die: ['不……不要……', '你答应过我的……', '……把她还给我。'] },
    mentor: { n: '师徒', a: '师父', b: '徒弟', die: ['师父——！', '我的徒弟……你这个畜生！'] },
    arms: { n: '战友', a: '战友', b: '战友', die: ['兄弟——不，姐妹……！', '给她报仇！'] }
  };
  // ---------------- 每张图：队长 + 关系 ----------------
  let lastB = null, assignAt = 0;
  function assign(W) {
    const fs = (W.foes || []).filter(f => !f.dead && !strong(f) && f.h && f.h.c && !f.b73); if (fs.length < 2) return;
    for (const f of fs) f.b73 = 1;
    if (fs.length >= 3) { const cap = fs.slice().sort((a, b) => ((b.tier | 0) * 10 + (b.rar | 0)) - ((a.tier | 0) * 10 + (a.rar | 0)))[0]; cap.cap73 = 1; cap.maxHp = cap.hp = Math.round(cap.maxHp * 1.15); }
    const pool = fs.filter(f => !f.cap73 || Math.random() < 0.5).sort(() => Math.random() - 0.5); let pairs = 0;
    for (let i = 0; i < pool.length && pairs < 3; i++) { const a = pool[i]; if (a.bond73) continue; const b = pool.find(o => o !== a && !o.bond73 && Math.hypot(o.pos.x - a.pos.x, o.pos.z - a.pos.z) < 12); if (!b) continue;
      const k = pick(['sis', 'sis', 'love', 'mentor', 'arms']), older = (a.tier | 0) >= (b.tier | 0) ? a : b, young = older === a ? b : a;
      older.bond73 = { o: young, k, me: 'a' }; young.bond73 = { o: older, k, me: 'b' }; pairs++; }
  }
  function onDeath(fo, decap) {
    const W = Wd(); if (!W) return; const t = now();
    if (fo.bond73 && fo.bond73.o && !fo.bond73.o.dead) { const o = fo.bond73.o, R = REL[fo.bond73.k], d = Math.hypot(o.pos.x - fo.pos.x, o.pos.z - fo.pos.z); o.bond73.lost = NM(fo);
      if (d < 30) { o.seen = true; const meB = o.bond73.me === 'b';
        if (fo.bond73.k === 'love' && Math.random() < 0.5) { o.broken = Math.max(o.broken || 0, 3); o.stag = Math.max(o.stag || 0, 2.4); say(o, pick(['……让我跟她一起走吧。', '不……不……', '……为什么是她。']), '#c8d8ff'); toast(`💔 ${NM(o)} 跪倒在 ${NM(fo)} 身边`, '#c8d8ff', 2.4); }
        else if (fo.bond73.k === 'mentor' && meB) { o.brave = false; o.state = 'flee'; o.flee73 = 1; say(o, pick(['师父……我会回来的！', '你给我记住！']), '#ffd0a0'); toast(`🏃 ${NM(o)} 哭着逃走了——她要是逃掉，会回来找你报仇`, '#ffd0a0', 2.6); }
        else { o.brave = true; o.state = 'chase'; o.dmgMul = (o.dmgMul || 1) * (fo.bond73.k === 'sis' ? 1.25 : 1.15); o.spdMul = (o.spdMul || 1) * 1.1; o.cd = Math.min(o.cd || 0, 0.3); say(o, pick(R.die), '#ff9a8a'); toast(`😡 ${NM(o)} 是 ${NM(fo)} 的${o.bond73.me === 'a' ? R.a : R.b}——她暴怒了`, '#ff9a8a', 2.6); } } }
    if (fo.cap73) { const near = (W.foes || []).filter(f => !f.dead && f !== fo && !strong(f) && Math.hypot(f.pos.x - fo.pos.x, f.pos.z - fo.pos.z) < 20); if (near.length) { toast(`🎖 队长 ${NM(fo)} 倒下了——她们的士气崩了`, '#ffe0a0', 2.6); for (const f of near) { const r = Math.random(); if (r < 0.5) { f.brave = false; f.state = 'flee'; f.flee73 = 1; if (Math.random() < 0.5) say(f, pick(['队长死了——快跑！', '撤、撤退！', '我不想死！']), '#ffe0a0'); } else if (r < 0.75) { f.broken = Math.max(f.broken || 0, 1.6); f.stag = Math.max(f.stag || 0, 1.2); say(f, pick(['不可能……', '队长……？']), '#ffe0a0'); } else { f.brave = true; f.state = 'chase'; f.dmgMul = (f.dmgMul || 1) * 1.15; say(f, pick(['为队长报仇！', '一起上！']), '#ff9a8a'); } } } }
    if (decap) { for (const f of (W.foes || [])) { if (f.dead || f === fo || strong(f) || !f.seen) continue; const d = Math.hypot(f.pos.x - fo.pos.x, f.pos.z - fo.pos.z); if (d > 14) continue; f.wit73 = f.wit73 || NM(fo); if (Math.random() < 0.35 && !(f.sayT > 0)) say(f, pick([`${NM(fo)}……！`, '怪物……你这个怪物！', '她的头……她的头……', '我看见了，我全都看见了。']), '#ffd0c0'); } }
  }
  // 逃走的目击者 / 徒弟 → 复仇宿敌
  function escaped(fo) { if (fo.esc73) return; fo.esc73 = 1; if (fo.noNem73) return; const why = (fo.bond73 && fo.bond73.lost) || fo.wit73; if (!why) return; if (!(fo.bond73 && fo.bond73.lost) && (fo.tier | 0) < 1 && Math.random() < 0.5) return; if (!window.Nemesis || !Nemesis.addFoe) return;
    try { fo._nemAdded = 0; Nemesis.addFoe(fo); if (window.Ng73) Ng73.trait('x:' + NM(fo), 'avenger', why, `🗡️ 复仇者：她亲眼看见你砍下了「${why}」的头`); } catch (e) { } }
  // ---------------- 名牌 ----------------
  let pl = null, cur = null, aimT = 0, plAt = 0; const V = () => (V.v || (V.v = new THREE.Vector3()));
  function plate() { if (pl) return pl; pl = document.createElement('div'); pl.id = 'h73pl'; pl.style.cssText = 'position:fixed;left:0;top:0;z-index:28;pointer-events:none;transform:translate(-50%,-100%);max-width:260px;padding:4px 10px 5px;background:linear-gradient(180deg,rgba(14,8,6,.82),rgba(14,8,6,.6));border-left:2px solid #e7c27a;color:#f3e6cf;font:12px/1.45 "Microsoft YaHei UI",system-ui,sans-serif;text-shadow:0 1px 2px #000;display:none;white-space:normal'; document.body.appendChild(pl); return pl; }
  function plateHTML(fo) { const c = fo.h.c, tags = []; if (fo.cap73) tags.push('🎖 队长'); if (fo.bond73) { const R = REL[fo.bond73.k], o = fo.bond73.o; tags.push(`${fo.bond73.k === 'love' ? '💞' : fo.bond73.k === 'sis' ? '👭' : fo.bond73.k === 'mentor' ? '📿' : '🤝'} ${esc(NM(o))} 的${esc(fo.bond73.me === 'a' ? R.a : R.b)}${o.dead ? '（已倒下）' : ''}`); } if (fo.wit73) tags.push(`👁 看见你砍了 ${esc(fo.wit73)}`); if (fo.moon73) tags.push('🌘 月光哨兵'); if (fo.wax73) tags.push('🕯️ 蜡封'); if (fo.cult73) tags.push('🕯️ 月之信徒');
    const id = (window.Lore && Lore.ID && Lore.ID[c.id] && Lore.ID[c.id].n) || c.idN || c.title || ''; const bio = fo.h.story || c.bio || (c.traits && c.traits.length ? '性格：' + c.traits.slice(0, 2).join('、') : '') || '';
    return `<b style="font-size:13.5px;color:#fff">${esc(c.name || '无名者')}</b>${fo.lvl ? ` <span style="color:#ffd27a">Lv.${fo.lvl}</span>` : ''}<br><span style="opacity:.85">${esc([c.title, id].filter((x, i, a) => x && a.indexOf(x) === i).join(' · '))}${c.race && window.Lore && Lore.RACES && Lore.RACES[c.race] ? ' · ' + esc(Lore.RACES[c.race].n || c.race) : ''}</span>${tags.length ? `<br>${tags.join('　')}` : ''}${bio ? `<br><span style="color:#cbbd9f">${esc(String(bio).slice(0, 46))}${String(bio).length > 46 ? '…' : ''}</span>` : ''}`; }
  function aim(W, t) { if (t - plAt < 0.1) return; const dt = t - plAt; plAt = t; const cam = G.camera; if (!cam || document.body.classList.contains('sgcine')) { if (pl) pl.style.display = 'none'; return; }
    const yw = G.player.yaw, pt = G.player.pitch || 0, fx = -Math.sin(yw) * Math.cos(pt), fz = -Math.cos(yw) * Math.cos(pt); let best = null, bs = 0.12;
    for (const fo of (W.foes || [])) { if (fo.dead || !fo.anchor || !fo.h || !fo.h.c) continue; const dx = fo.pos.x - W.pos.x, dz = fo.pos.z - W.pos.z, d = Math.hypot(dx, dz); if (d > 14 || d < 0.6) continue; const off = 1 - (dx * fx + dz * fz) / d; if (off < bs) { bs = off; best = fo; } }
    if (best !== cur) { cur = best; aimT = 0; } else aimT += dt;
    const p = plate(); if (!cur || aimT < 0.3) { p.style.display = 'none'; return; }
    if (p._fo !== cur || p._sig !== (cur.bond73 && cur.bond73.o && cur.bond73.o.dead ? 1 : 0) + (cur.wit73 ? 2 : 0)) { p._fo = cur; p._sig = (cur.bond73 && cur.bond73.o && cur.bond73.o.dead ? 1 : 0) + (cur.wit73 ? 2 : 0); p.innerHTML = plateHTML(cur); }
    const v = V().copy(cur.anchor.pos); v.y += 0.45; v.project(cam); if (v.z > 1) { p.style.display = 'none'; return; } p.style.display = 'block'; p.style.left = ((v.x + 1) / 2 * innerWidth).toFixed(0) + 'px'; p.style.top = ((1 - v.y) / 2 * innerHeight).toFixed(0) + 'px'; }
  // ---------------- 每帧 ----------------
  function frame() { if (!on()) { if (pl) pl.style.display = 'none'; return; } const W = Wd(); if (!W || !W.B) { if (pl) pl.style.display = 'none'; return; } const t = now();
    if (W.B !== lastB) { lastB = W.B; assignAt = t + 2.5; } if (assignAt && t > assignAt && !W.busy) { assignAt = 0; assign(W); }
    for (const fo of (W.foes || [])) { if (fo.flee73 && !fo.dead) { fo.brave = false; if (fo.state === 'chase') fo.state = 'flee'; } if (fo.escaped && !fo.esc73) escaped(fo); }
    aim(W, t); }
  function onEv(t, fo) { if (!on() || !fo || !fo.h) return; if (t === 'kill') { onDeath(fo, !!fo.decap); if (fo.decap) fo.d73 = 1; } else if (t === 'decap' && fo.dead && !fo.d73) { fo.d73 = 1; onDeath({ pos: fo.pos, h: fo.h, bond73: null, cap73: null }, true); } }
  setInterval(() => { if (pl && !Wd()) pl.style.display = 'none'; }, 500);
  let wired = false;
  function wire() { if (wired || !window.G || !G.HOOK || !window.R73) return false; wired = true; G.HOOK.world = G.HOOK.world || []; G.HOOK.world.push(frame); R73.on(onEv); return true; }
  if (!wire()) { const iv = setInterval(() => { if (wire()) clearInterval(iv); }, 400); }
  return { on, REL, plateHTML };
})();
