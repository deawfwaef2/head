// R73 MOD nem_grow2（默认开）：宿敌随「事件」成长，有了伤疤 / 记仇 / 胜者 / 新招 / 猎场——猎场会改变地图。
//  用户：「宿敌也会随时间随事件，而且也许也会对地图造成影响」。（NemStory 的 8 种成长方面、插曲电影照旧；这里只加「为什么变强」和不重复的新特质）
//  成长条（每名宿敌 0~100，满了 = 等级 +1，NemStory 会自动排进插曲）：
//    你从她面前离开（换图 / 回洞时她还活着、已经和你交过手）+60 · 她打倒了你 +100 · 你砍下她的同族 +15 · 你斩下精英/BOSS（名声）+8 · 月蚀 ≥75 每趟 +10
//  特质：🩹伤疤（她带着不到一半的血逃走：下次生命 +15%/层）· 🧠记仇（一场里被你完美格挡 3 次还活着：以后一直记得你的格挡节奏）
//        🏆胜者（打倒过你：伤害 +10%）· 🌀新招（升级时 50% 学会一个 R73 新技能）· ⚑猎场（同一地区遇到她两次：那里成为她的猎场）
//  猎场：进入该地区的地图 → 门边插着她的旗、雾色发暗、宿敌逼近条直接 +25（她更快找到你）；在她的猎场里打倒她 = 夺回猎场。
window.Ng73 = (() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('nem_grow2') !== false;
  const Wd = () => (window.Worlds && Worlds.active ? Worlds._W : null);
  const now = () => performance.now() / 1000;
  const T = () => window.THREE;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (t, c, s) => { try { G.toast(t, c || '#ffb0a0', s || 3); } catch (e) { } };
  const ndOf = W => W && W.graph && W.graph.nodes[W.cur];
  const regOf = W => { const nd = ndOf(W); return (nd && (nd.region || (nd.loc && nd.loc.k))) || ''; };
  const regName = k => { try { const L = window.Lore && Lore.LOCS.find(l => l.k === k); return L ? L.n : k; } catch (e) { return k; } };
  function S() { const s = G.S; if (!s.ng73) s.ng73 = { k: {}, ground: {} }; return s.ng73; }
  function rec(key) { const s = S(); return s.k[key] || (s.k[key] = { g: 0, tr: {}, meet: {}, sk: [], log: [], lv: 0 }); }
  const keyOf = fo => fo && (fo.hunter2 ? 'h:' + fo.hunter2 : fo.nemX ? 'x:' + (fo.nemIdx || (fo.h && fo.h.c && fo.h.c.name)) : null);
  function nameOf(key) { if (key.startsWith('h:')) { const d = window.Hunters2 && Hunters2.BY[key.slice(2)]; return d ? d.n : key.slice(2); } return key.slice(2); }
  function alive(key) { try { if (key.startsWith('h:')) { const L = Hunters2.SS().L[key.slice(2)]; return !!(L && !L.dead); } const N = Nemesis.S(); return !!(N.extra || []).find(e => 'x:' + e.n === key); } catch (e) { return false; } }
  function list() { const out = []; try { if (window.Hunters2 && (!Hunters2.on || Hunters2.on())) for (const d of Hunters2.alive()) out.push({ key: 'h:' + d.id, n: d.n, ic: d.ic, col: d.col, lv: Hunters2.lvOf(d.id), c: { id: d.fid } }); } catch (e) { }
    try { const N = window.Nemesis && Nemesis.S && Nemesis.S(); if (N && N.extra) for (const x of N.extra) out.push({ key: 'x:' + x.n, n: x.n, ic: '🩸', col: '#ff8a7a', lv: x.lv + Math.floor(((N.play || 0) - (x.at || 0)) / 300), c: (x.h && x.h.c) || {} }); } catch (e) { } return out; }
  function lvUp(key) { try { if (key.startsWith('h:')) { const L = Hunters2.SS().L[key.slice(2)]; if (L) L.esc++; } else { const x = (Nemesis.S().extra || []).find(e => 'x:' + e.n === key); if (x) x.lv++; } } catch (e) { } }
  function note(key, s) { const r = rec(key); r.log.unshift({ t: Date.now(), s }); if (r.log.length > 8) r.log.length = 8; }
  function grow(key, amt, why) {
    if (!on() || !alive(key)) return; const r = rec(key); r.g += amt; note(key, `${why}（成长 +${amt}）`);
    let ups = 0; while (r.g >= 100) { r.g -= 100; ups++; lvUp(key); r.lv++; if (Math.random() < 0.5 && window.Skills73) { const all = Object.keys(Skills73.SK).filter(k => !r.sk.includes(k)); if (all.length) { const k = all[Math.floor(Math.random() * all.length)]; r.sk.push(k); note(key, `🌀 学会了「${Skills73.SK[k].n}」`); } } }
    if (ups) toast(`🩸 ${nameOf(key)} 变强了 Lv+${ups}——${why}`, '#ff9a8a', 3.4); else if (amt >= 15) toast(`🩸 ${nameOf(key)} 的成长 +${amt}（${Math.round(r.g)}/100）· ${why}`, '#ffb8a8', 2.2);
  }
  function trait(key, k, v, msg) { const r = rec(key); const old = r.tr[k] || 0; r.tr[k] = v === '+' ? Math.min(2, old + 1) : v; if (r.tr[k] !== old) { note(key, msg); toast(`🩸 ${nameOf(key)}：${msg}`, '#ffb0a0', 3); } }
  const TR = { scar: ['🩹', '伤疤', n => `生命 +${15 * n}%`], grudge: ['🧠', '记仇', () => '记得你的格挡节奏（完美格挡窗口更窄）'], winner: ['🏆', '胜者', () => '打倒过你：伤害 +10%'], avenger: ['🗡️', '复仇者', () => '亲眼看见你砍头的人：伤害 +12%，更快找到你'], ground: ['⚑', '猎场', v => `「${regName(v)}」是她的猎场`] };
  function trHTML(r) { const out = []; for (const k in r.tr) { const v = r.tr[k], d = TR[k]; if (!v || !d) continue; out.push(`<span title="${esc(d[2](v))}">${d[0]}${d[1]}${typeof v === 'number' && v > 1 ? '×' + v : ''}</span>`); } for (const k of r.sk) if (window.Skills73 && Skills73.SK[k]) out.push(`<span>🌀${esc(Skills73.SK[k].n)}</span>`); return out.join(' '); }

  // ---------------- 野外：在场的宿敌、出场时套特质 ----------------
  let lastW = null, lastB = null, seenHere = new Map(), parr = new Map(), groundObjs = [], groundSc = null;
  function applySpawn(fo, key) {
    fo.ng73 = 1; const r = rec(key), say = s => { try { setTimeout(() => Foe.say(fo, s, '#ffb0a0'), 1800); } catch (e) { } };
    if (r.tr.scar) { fo.maxHp = fo.hp = Math.round(fo.maxHp * (1 + 0.15 * r.tr.scar)); say('这道疤，是你留下的。'); }
    if (r.tr.winner) { fo.dmgMul = (fo.dmgMul || 1) * 1.1; if (!r.tr.scar) say('又见面了。你上次倒下的样子，我还记得。'); }
    if (r.tr.avenger) { fo.dmgMul = (fo.dmgMul || 1) * 1.12; say(`你砍下「${r.tr.avenger}」的头的时候，我就在那里。`); }
    if (r.tr.grudge) fo.grudge73 = 1;
    if (r.sk.length && window.Skills73) { try { const k0 = Skills73.kit(fo); fo._x3 = k0.concat(r.sk.filter(k => !k0.includes(k))); } catch (e) { } }
  }
  function frame(dt) {
    if (!on()) return; const W = Wd(); const t = now();
    if (W !== lastW) { if (lastW && !W) leaveNode(lastW, true); if (W && !lastW) tripStart(W); lastW = W; lastB = null; }
    if (!W || !W.B) return;
    if (W.B !== lastB) { if (lastB) leaveNode(W, false); lastB = W.B; seenHere = new Map(); nodeEnter(W); }
    for (const fo of (window.Foe && Foe.foes) || []) { const key = keyOf(fo); if (!key) continue; if (!fo.ng73) applySpawn(fo, key);
      if (!fo.dead && fo.seen && !seenHere.has(key)) { seenHere.set(key, fo); meet(key, W); }
      if (fo.grudge73 && !fo.dead && (!fo._ppT || t - fo._ppT > 1)) { fo._pp = Math.max(fo._pp || 0, 3); fo._ppT = t; }
      if (fo.dead && !fo.ng73done) { fo.ng73done = 1; const pc = parr.get(fo) || 0;
        if (fo.escaped) { if (fo.hp < fo.maxHp * 0.5) trait(key, 'scar', '+', `带着伤逃走了——🩹伤疤（下次生命 +15%）`); if (pc >= 3) trait(key, 'grudge', 1, '🧠 记住了你的格挡节奏'); }
        else { const g = S().ground, reg = regOf(W); if (g[reg] === key) { delete g[reg]; rec(key).tr.ground = 0; toast(`⚑ 你在「${regName(reg)}」打倒了 ${nameOf(key)}——夺回了她的猎场`, '#ffe28a', 3.2); clearGround(); } } } }
    if (W.dead && !W.ng73dead) { W.ng73dead = 1; for (const [key, fo] of seenHere) if (fo && !fo.dead) { trait(key, 'winner', 1, '🏆 打倒了你'); grow(key, 100, '她打倒了你'); } }
  }
  function meet(key, W) { const r = rec(key), reg = regOf(W); if (!reg) return; const tr = W.trip || {}; tr.ng73m = tr.ng73m || {}; if (tr.ng73m[key + reg]) return; tr.ng73m[key + reg] = 1; r.meet[reg] = (r.meet[reg] || 0) + 1;
    const g = S().ground; if (r.meet[reg] >= 2 && !g[reg] && !Object.values(g).includes(key)) { g[reg] = key; r.tr.ground = reg; note(key, `⚑ 「${regName(reg)}」成了她的猎场`); toast(`⚑ 「${regName(reg)}」成了 ${nameOf(key)} 的猎场——以后在这里，她会更快找到你`, '#ff9a8a', 4); } }
  function leaveNode(W, tripEnd) { const t = now(); for (const [key, fo] of seenHere) { if (!fo || fo.dead || fo.escaped) continue; const pc = parr.get(fo) || 0; if (pc >= 3) trait(key, 'grudge', 1, '🧠 记住了你的格挡节奏'); if (fo.hp < fo.maxHp && !(W && W.dead)) grow(key, 60, '你从她面前离开了——她记下了你的路线'); } seenHere = new Map(); clearGround(); }
  function tripStart(W) { W.ng73dead = 0; let k = 0; try { k = window.M73 ? M73.tierOf(M73.eNow()) : 0; } catch (e) { } if (k >= 3) for (const n of list()) grow(n.key, 10, '月蚀之下，宿敌们在变强'); }
  function nodeEnter(W) { const reg = regOf(W), key = S().ground[reg]; if (!key || !alive(key)) return; const nd = ndOf(W); if (!nd || nd.home || nd.arena || W.graph.arena) return;
    const sc = W.B.sc; groundSc = sc; try { R73.fog(sc, 'nem', '#3a0808', 0.25, 1.1); } catch (e) { }
    for (const d of (W.B.doors || []).slice(0, 3)) { const a = Math.random() * 6.283, x = d.x + Math.sin(a) * 2.2, z = d.z + Math.cos(a) * 2.2, y = W.B.H(x, z), g = new (T().Group)(); g.position.set(x, y, z); let m = null; try { m = window.Assets && Assets.has('kite_shield') ? Assets.fit('kite_shield', { h: 0.95, ry: Math.random() * 6 }) : null; } catch (e) { } if (m) { m.rotation.x = -0.25; g.add(m); } let w = null; try { w = window.Assets && Assets.has('antique_estoc') ? Assets.fit('antique_estoc', { h: 1.2 }) : null; } catch (e) { } if (w) { w.position.set(0.35, 0, 0); w.rotation.z = 0.12; g.add(w); } sc.add(g); groundObjs.push(g); }
    const tr = W.trip || {}; if (!tr['ng73g' + reg]) { tr['ng73g' + reg] = 1; try { const N = Nemesis.S(); N.p = Math.min(100, (N.p || 0) + 25); } catch (e) { } toast(`⚑ 门边插着 ${nameOf(key)} 的旗——这里是她的猎场（逼近 +25）。在这里打倒她，就能夺回猎场`, '#ff9a8a', 4); } }
  function clearGround() { for (const g of groundObjs) if (g.parent) g.parent.remove(g); groundObjs = []; if (groundSc) { try { R73.fogClear(groundSc, 'nem'); } catch (e) { } groundSc = null; } }
  function onEv(t, fo) { if (!on() || !fo) return; const key = keyOf(fo);
    if (t === 'parry' && key) parr.set(fo, (parr.get(fo) || 0) + 1);
    if (t === 'decap' && !key && fo.h && fo.h.c) { const c = fo.h.c; const st = window.Foe && Foe.STRONG && Foe.STRONG(fo);
      if (st) for (const n of list()) grow(n.key, 8, `你斩下了「${c.name || '强敌'}」，名声传开了`);
      else for (const n of list()) { if (n.c && ((n.c.id && n.c.id === c.id) || (n.c.race && c.race && n.c.race === c.race && n.key.startsWith('x:')))) grow(n.key, 15, `你砍下了她的同族「${c.name || ''}」`); } } }

  // ---------------- 报告：选地点右侧面板 + 主线面板 ----------------
  function html(max) { const L = list(); if (!L.length) return ''; const s = S();
    return L.slice(0, max || 6).map(n => { const r = rec(n.key), last = r.log[0]; return `<div style="margin:5px 0"><b style="color:${esc(n.col)}">${esc(n.ic)} ${esc(n.n)}</b> Lv.${n.lv} <span style="display:inline-block;width:70px;height:5px;background:#0008;border:1px solid #ff8a7a55;vertical-align:middle"><i style="display:block;height:100%;width:${Math.min(100, r.g).toFixed(0)}%;background:#ff6a5a"></i></span> <small>${Math.round(r.g)}/100</small><br><small>${trHTML(r) || '<span style="opacity:.6">还没有特质</span>'}${last ? ` · ${esc(last.s)}` : ''}</small></div>`; }).join('') + (Object.keys(s.ground).length ? `<div style="margin-top:4px;font-size:12px;color:#ff9a8a">⚑ 猎场：${Object.entries(s.ground).filter(([, k]) => alive(k)).map(([r, k]) => `${esc(regName(r))}（${esc(nameOf(k))}）`).join('、')}</div>` : ''); }
  function sideAug() { const el = document.getElementById('lpSide'); if (!el || el.querySelector('.ng73s') || !on()) return; const h = html(4); if (!h) return; const sec = document.createElement('section'); sec.className = 'ng73s'; sec.style.setProperty('--bc', '#ff8a7a'); sec.innerHTML = `<h4>🩸 宿敌动向 <small>成长满 100 = 升一级</small></h4><div style="font-size:13px">${h}</div><p class="m">你从宿敌面前离开、被她打倒、砍她的同族、斩下强敌都会让她成长。</p>`; el.appendChild(sec); }
  setInterval(() => { try { sideAug(); } catch (e) { } }, 450);
  let wired = false;
  function wire() { if (wired || !window.G || !G.HOOK || !window.R73) return false; wired = true; G.HOOK.world = G.HOOK.world || []; G.HOOK.world.push(frame); R73.on(onEv); return true; }
  if (!wire()) { const iv = setInterval(() => { if (wire()) clearInterval(iv); }, 400); }
  return { on, S, rec, grow, trait, list, html, keyOf, nameOf };
})();
