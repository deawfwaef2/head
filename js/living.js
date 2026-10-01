// R54g MOD living_region（默认开）：活的地区——每个地区固定 1000 名居民分布在各地点，杀一个少一个（存档）；
// 警觉：杀得越多越警觉（更多人拿起武器、更早发现你、民兵集结）；诅咒：你身上月之巫女的诅咒会一点点污染去过的地区（雾色变暗紫，居民会议论）；
// 局面：进入地点时按地区状态掷出居民事件（集市日 / 葬礼 / 民兵集结 / 驱魔仪式 / 逃难人群 / 废村）；记忆：居民记得你上次干了什么。
// MOD foe_levels（默认开）：敌人有等级——地区基础等级不同（高等级地区的小兵也很强），同一地区里还有老兵/精英/冠军，打不过就跑；等级越高招式越多。
window.Living = (() => {
  const on = () => !window.Mods || Mods.on('living_region') !== false;
  const onL = () => !window.Mods || Mods.on('foe_levels') !== false;
  const G = () => window.G, W = () => (window.Worlds && Worlds._W) || null;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => o[k] != null ? o[k] : m);
  function reg(k) {
    const S = G().S; S.liv = S.liv || {}; let R = S.liv[k];
    if (!R) R = S.liv[k] = { pop: 1000, alive: {}, alert: 0, corrupt: 0, kills: 0, visits: 0, last: null, nk: {} };
    return R;
  }
  function initNodes(R, graph) {
    if (R.init) return; R.init = 1; const ws = graph.nodes.map(n => n.home ? 0 : n.size === 'l' ? 3 : n.size === 'm' ? 2 : 1), tot = ws.reduce((a, b) => a + b, 0) || 1;
    let left = R.pop; graph.nodes.forEach((n, i) => { const c = Math.floor(R.pop * ws[i] / tot); R.alive[i] = c; left -= c; }); for (let i = 0; left > 0 && i < graph.nodes.length; i++) if (ws[i]) { R.alive[i]++; left--; }
  }
  // ---- 出发：每趟开始时警觉回落一些，诅咒很慢地消退 ----
  let tripSeen = null;
  function tripStart(w) { if (!on() || !w || !w.graph || !w.graph.trip) return; const R = reg(w.graph.loc.k); initNodes(R, w.graph); if (tripSeen !== w) { tripSeen = w; R.alert *= 0.82; R.corrupt *= 0.985; R.visits++; } }
  // ---- 地点人数 + 局面（worlds.populate 调用）----
  const EV = {
    market: { n: '集市日', c: '#ffe0a0', d: '居民们在摆摊叫卖，人比平时多，也更松懈。', k: 1.4, armed: 0 },
    funeral: { n: '葬礼', c: '#c8c8d8', d: '他们在埋葬被你杀死的亲人。哭声里夹着咒骂。', k: 1.1, armed: 0 },
    militia: { n: '民兵集结', c: '#ff9a7a', d: '警钟响了。拿着农具和旧剑的民兵正在集结，准备猎杀你。', k: 1.5, armed: 2 },
    exorcism: { n: '驱魔仪式', c: '#c8a8ff', d: '修女们在焚香驱魔——她们说这片土地染上了月之诅咒。', k: 1.2, armed: 1 },
    refugees: { n: '逃难人群', c: '#b0d0ff', d: '幸存者背着包袱往外逃。他们一看见你就会四散。', k: 0.8, armed: 0 },
    empty: { n: '废村', c: '#9a9a9a', d: '这里已经没有活人了。只剩下被翻倒的桌椅和发黑的血迹。', k: 0, armed: 0 }
  };
  function count(node, n, r) {
    if (!on()) return n; const w = W(); if (!w || !w.graph || !w.graph.trip) return n;
    const R = reg(node.region); initNodes(R, w.graph); tripStart(w); const alive = R.alive[node.i] | 0, nk = R.nk[node.i] | 0;
    let ev = null;
    if (!node.home) {
      if (alive <= 0) ev = 'empty';
      else { const opts = []; opts.push(['market', R.alert < 0.25 ? 2 : 0.3]); if (nk >= 2) opts.push(['funeral', 1.6]); if (R.alert > 0.35) opts.push(['militia', R.alert * 3]); if (R.corrupt > 0.25) opts.push(['exorcism', R.corrupt * 2.5]); if (R.alert > 0.5 && alive < 25) opts.push(['refugees', 1.5]); opts.push([null, 2.2]);
        let x = r() * opts.reduce((a, o) => a + o[1], 0); for (const [k, wt] of opts) { if ((x -= wt) <= 0) { ev = k; break; } } }
    }
    node._ev = ev; const E = ev && EV[ev];
    if (E) n = Math.round(n * E.k) + E.armed + (ev === 'market' ? 1 : 0);
    if (R.alert > 0.45 && ev !== 'empty') n += 1;
    return Math.max(0, Math.min(n, alive, 9));
  }
  // ---- 敌人等级（foe.js populate 每个敌人调用）----
  const TIER = [['', '#d8d0c0', 0.62, [0, 2]], ['老兵', '#9fd0ff', 0.25, [3, 6]], ['精英', '#c890ff', 0.10, [7, 12]], ['冠军', '#ffb040', 0.03, [13, 20]]];
  const baseLv = (k) => 1 + 4 * Math.max(0, (window.Lore && Lore.LOCS ? Lore.LOCS.findIndex(l => l.k === k) : 0));
  function plv() { try { return RPG.lvOf(G().S.xp).lv; } catch (e) { return 1; } }
  function foe(fo, it) {
    if (!onL() || !fo) return; const w = W(), k = (w && w.graph && w.graph.loc && w.graph.loc.k) || (it && it.bossK) || 'village', R = on() && w && w.graph && w.graph.trip ? reg(k) : null;
    let t = 0; if (it && it.boss) t = 3; else { const x = Math.random(); let acc = 0; for (let i = 0; i < TIER.length; i++) { acc += TIER[i][2] * (i && R ? 1 + R.alert * 0.6 : 1); if (x <= acc) { t = i; break; } } } // 越警觉高阶的越多
    const LP = window.Loop && Loop.on() ? Loop : null; // R54i run_loop：章节 BOSS 等级固定可预知、每章 +5；世道改敌人等级/生命/伤害
    const rg = TIER[t][3], lv = (it && it.boss && LP ? (LP.isBossTrip() && LP.bossLv ? LP.bossLv() - LP.enemyLv() : baseLv(k) + 4 + LP.chapLv()) : baseLv(k) + rg[0] + Math.floor(Math.random() * (rg[1] - rg[0] + 1)) + (it && it.boss ? 2 : 0)) + (LP ? LP.enemyLv() : 0), d = lv - plv();
    fo.lvl = lv; fo.tier = t;
    const hk = Math.max(0.7, Math.min(4, Math.pow(1.1, d))) * (LP ? LP.enemyHp() : 1), dk = Math.max(0.7, Math.min(3, Math.pow(1.07, d))) * (LP ? LP.enemyDmg() : 1);
    fo.maxHp = fo.hp = Math.max(6, Math.round(fo.maxHp * hk)); fo.dmgMul = (fo.dmgMul || 1) * dk; fo.iq = Math.min(1.3, (fo.iq || 0.5) + t * 0.12); if (t >= 2) fo.brave = true;
  }
  // ---- 事件：击杀 → 人口 / 警觉 / 诅咒 ----
  function event(t, fo) {
    if (!on() || !(t === 'kill' || t === 'decap' || t === 'execute' || t === 'onecut' || t === 'halve')) return; const w = W(); if (!w || !w.graph || !w.graph.trip || !fo || fo._livDead) return; fo._livDead = 1;
    const R = reg(w.graph.loc.k), i = w.cur; R.alive[i] = Math.max(0, (R.alive[i] | 0) - 1); R.pop = Math.max(0, R.pop - 1); R.kills++; R.nk[i] = (R.nk[i] | 0) + 1;
    R.alert = Math.min(1, R.alert + 0.035 + (fo.tier || 0) * 0.01); R.corrupt = Math.min(1, R.corrupt + 0.008);
    R.last = { node: w.graph.nodes[i].name, kills: (R.last && R.last.trip === w.trip ? R.last.kills : 0) + 1, trip: w.trip };
  }
  // ---- 进入地点：局面横幅 + 诅咒雾色 ----
  function enter(node, B) {
    if (!on()) return; const w = W(); if (!w || !w.graph || !w.graph.trip || !B || B.corr) return; const R = reg(node.region), E = node._ev && EV[node._ev];
    if (E) setTimeout(() => { try { G().toast(`📜 ${E.n}：${E.d}`, E.c, 4.2); } catch (e) { } }, 900);
    else if (R.alert > 0.6) setTimeout(() => { try { G().toast('🔔 整个地区都在戒备——居民会更早发现你，也更多人拿着武器', '#ffb090', 3.2); } catch (e) { } }, 900);
    try { if (B.sc.fog && R.corrupt > 0.05) { const k = Math.min(0.55, R.corrupt * 0.7); B.sc.fog.color.lerp(new THREE.Color('#3b2a52'), k); if (B.sun) B.sun.color.lerp(new THREE.Color('#b8a0e0'), k * 0.5); } } catch (e) { }
    hiWarned = false;
  }
  // ---- 每帧：居民第一次看见你 → 按记忆 / 警觉 / 诅咒说话；等级差太大提醒逃跑；你在地区里待着诅咒慢慢加深 ----
  const L = {
    memory: ['又是你！上次你在「{node}」杀了 {n} 个人！', '我认得你……「{node}」的血还没干！', '就是它！在「{node}」吃人的那个！'],
    alert: ['警钟！它来了！', '所有人拿起武器！', '别让它靠近孩子们！', '我们早就在等你了，怪物。'],
    curse: ['你闻到了吗……月之诅咒的腐味，是它带来的！', '庄稼全烂了，都是你害的！', '井水变黑了……是你身上的诅咒！'],
    few: ['求求你……我们这里已经没剩几个人了……', '你还要杀多少人才够？'],
    champ: ['就凭你？', '跪下。', '我会让你后悔来这里。']
  };
  let hiWarned = false, cAcc = 0;
  function frame(dt) {
    const w = W(); if (!w || !w.graph || !w.graph.trip || !window.Foe || w.busy || (w.B && w.B.corr)) return; const C = Foe.ctx();
    if (on()) { const R = reg(w.graph.loc.k); cAcc += dt; if (cAcc > 5) { R.corrupt = Math.min(1, R.corrupt + 0.002 * cAcc / 5); cAcc = 0; } }
    for (const fo of Foe.foes) { if (fo.dead || !fo.seen || fo._liv) continue; fo._liv = 1;
      if (onL() && fo.lvl != null && C) { const tg = TIER[fo.tier || 0]; try { C.say(fo.anchor, `Lv.${fo.lvl}${tg[0] ? ' ' + tg[0] : ''}`, tg[1]); } catch (e) { } if (!hiWarned && fo.lvl - plv() >= 6) { hiWarned = true; try { G().toast(`⚠️ 「Lv.${fo.lvl}」远高于你（Lv.${plv()}）——打不过就跑，变强了再回来`, '#ff9a70', 3.4); } catch (e) { } } }
      if (!on() || !C || Math.random() > 0.55) continue; const R = reg(w.graph.loc.k), alive = R.alive[w.cur] | 0; let pool = null, o = {};
      if (fo.tier >= 3) pool = L.champ; else if (R.last && R.last.trip !== w.trip && R.last.kills >= 2 && Math.random() < 0.6) { pool = L.memory; o = { node: R.last.node, n: R.last.kills }; } else if (R.corrupt > 0.3 && Math.random() < 0.5) pool = L.curse; else if (alive < 15 && alive > 0) pool = L.few; else if (R.alert > 0.4) pool = L.alert;
      if (pool) setTimeout(() => { try { if (!fo.dead) C.say(fo.anchor, fmt(pick(pool), o), '#ffd8c0'); } catch (e) { } }, 1200 + Math.random() * 900); }
  }
  function info(k) { if (!G() || !G().S.liv || !G().S.liv[k]) return null; const R = G().S.liv[k]; return { pop: R.pop, alert: R.alert, corrupt: R.corrupt, kills: R.kills }; }
  return { on, count, foe, event, enter, frame, info, EV };
})();
