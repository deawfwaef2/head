// R35 MOD hunters2（默认开，替换旧 ogre_hunters）：四名「主角式」正义猎手。
// ─ 仇恨（永久）：你每放倒 1 人 +1、每斩首 1 颗 +0.5。每 15 点仇恨 → 四名猎手全部 +1 级（确定性，面板里写明）。
// ─ 逃脱成长：猎手血量掉到 30% 会逃跑，3.2 秒后传送消失 → 该猎手永久 +1 级。只有在她逃走前打死，才算真正斩杀。
// ─ 入侵：出猎地图里（洞穴 / 洞口节点 / 霸主战 / 精英擂台除外）有一条「猎手感应」——放倒、斩首和停留时间都会让它上涨，
//   停得越久涨得越快；满了之后每 5 秒掷骰（时间越长概率越高），随机一名活着的猎手穿越到你所在的地图。
// ─ 她在场时：所有门（包括撤离回洞）封锁。她 150 秒内没分出胜负会暂时撤退（不成长）。
// ─ 四人全部斩杀 = 胜利条件的一部分（Victory2）。
// 实现：Foe.populate(ctx, [{h,pos}], {keep:true}) 中途追加；__forceRole / __forceAff 指定职业词缀；fo.skPool 限定 R34 技能；fo.absRec 让 FoeAbs 按她的战力换算血量/伤害。
window.Hunters2 = (() => {
  const on = () => !window.Mods || Mods.on('hunters2');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const V3 = () => new THREE.Vector3();
  const HATE_STEP = 15, FLEE_AT = 0.3, FLEE_T = 3.2, STAY_T = 150, HP0 = 120;
  const D = [
    { id: 'aerin', n: '艾琳·晨星', t: '被选中的勇者', ic: '🌟', col: '#ffe08a', base: 3, fid: 'knight', role: 'duelist', aff: ['relentless'], sk: ['leap', 'charge', 'breaker'],
      bio: '神谕在她十六岁那年点名：「持晨星之剑者，将终结食人之魔。」她的村子在同一年被屠尽。此后她只做一件事——找到你。',
      style: '正面强攻，连斩不停，跃斩和冲锋都很远。破防击会打穿格挡。', lines: ['以晨星之名——你的狩猎到此为止！', '村子里的人，我一个一个都记得。', '我不会再逃……这次一定！', '神谕从不出错。'] },
    { id: 'nove', n: '诺薇·灰隼', t: '血迹追迹者', ic: '🦅', col: '#b8c8d8', base: 2, fid: 'assassin', role: 'skirm', aff: ['phantom'], sk: ['leap', 'whirl'],
      bio: '王国最贵的赏金追迹者，从不失手。她能从一滴干涸的血里读出你走过的路。她说追你不是为了赏金——是因为你是她唯一没抓到的猎物。',
      style: '会瞬移到你背后偷袭（听到“嗖”就转身），打了就跑，旋风斩近身很疼。', lines: ['找到你了。', '血迹还是温的呢。', '别回头——我就在你后面。', '下次，我会更快。'] },
    { id: 'gwen', n: '葛温·铁砧', t: '锻炉的守誓人', ic: '🔨', col: '#ff9a60', base: 4, fid: 'merc', role: 'juggernaut', aff: ['iron', 'regen'], sk: ['charge', 'breaker', 'whirl'],
      bio: '铁匠的女儿，亲手打了自己的铠甲和那把比她还高的斩斧。她发誓在熄灭锻炉之前把你的头挂上城门——锻炉已经烧了三年没灭。',
      style: '重甲护盾（每挨一刀掉一层，蓄力斩/破绽一刀打碎），不挨打时快速回血——要打就一口气打完。', lines: ['锻炉还没熄。', '站好，让我看看你的骨头有多硬。', '这身铠甲是为你打的。', '我会回来，带着更重的锤。'] },
    { id: 'mia', n: '米娅·星语', t: '星象学院首席', ic: '🔮', col: '#c8a0ff', base: 1, fid: 'inquisitor', role: 'mage', aff: ['regen'], sk: [],
      bio: '十四岁破格入学、十九岁成为首席的天才魔导士。她用星图推算出了你的下一次出猎——然后一个人来了。「学院不相信我的推算。那我就亲自证明。」',
      style: '保持距离放魔弹，血少时三连发；靠近她就会后撤。别在开阔地和她对射。', lines: ['星图说，你今天会输。', '推算完毕——就是现在！', '别靠近我！……我是说，别想靠近我！', '下一次的星象，对我有利。'] }
  ];
  const BY = {}; D.forEach(d => BY[d.id] = d);

  // ================= 存档 / 等级（确定性） =================
  const G_ = () => window.G;
  function SS() { const S = G_().S; S.h2 = S.h2 || { hate: 0, L: {} }; for (const d of D) S.h2.L[d.id] = S.h2.L[d.id] || { esc: 0, dead: 0, meet: 0, wd: 0 }; return S.h2; }
  const lvOf = id => { const s = SS(), d = BY[id]; return d.base + Math.floor(s.hate / HATE_STEP) + s.L[id].esc; };
  const powOf = L => Math.round(38 * Math.pow(1.16, L));
  function myPow() { try { return G_().st().power; } catch (e) { return 50; } }
  function odds(id) { // 预估胜率：你几刀砍死她 vs 她几下打死你
    const rec = powOf(lvOf(id)); if (!window.FoeAbs) return { p: 0.5, my: 0, her: 0 };
    const st = G_().st(), myD = 12 * FoeAbs.power() * (window.Gear2 ? Gear2.avgMul() : 1), herHp = HP0 * FoeAbs.hpK(rec) * (BY[id].aff.length ? 1.3 : 1);
    const herD = FoeAbs.REF(rec) * 0.12 * (1 - Math.min(0.5, (st.def || 0) / ((st.def || 0) + 300))) * (1 - ((window.Gear2 && Gear2.sum().dr) || 0) / 100), my = Math.max(1, Math.ceil(herHp / myD)), her = Math.max(1, Math.ceil(st.maxHp / Math.max(1, herD)));
    const ratio = her * 2 / my, p = Math.max(0.01, Math.min(0.99, ratio * ratio / (1 + ratio * ratio)));
    return { p, my, her, rec, hp: Math.round(herHp) };
  }
  const alive = () => D.filter(d => !SS().L[d.id].dead);

  // ================= 本趟状态 =================
  let T = null; // { m, t0, armedAt, k0, d0, cool, fo, id, fleeAt, spawnAt, spawning }
  function newTrip() { T = { m: 0, last: performance.now(), armedAt: 0, k0: 0, d0: 0, kH: 0, dH: 0, cool: 0, fo: null, id: null, fleeAt: 0, spawnAt: 0, spawning: false, rollT: 0 }; }

  function recFor(id, loc) {
    const S = G_().S, s = SS().L[id], d = BY[id];
    if (!s.rec) {
      const h = RPG.foe(S, loc, (Math.imul(D.indexOf(d) + 11, 2654435761) ^ 0x5eed) >>> 0, G_().usedNames, G_().usedSig);
      s.rec = { c: Object.assign({}, h.c), look: h.look };
    }
    const h = { c: Object.assign({}, s.rec.c, { id: d.fid, idN: d.t, title: d.t, name: d.n, rar: 4 }), look: s.rec.look, hunter2: id, story: d.bio };
    return h;
  }

  async function spawn(id) {
    const W = Worlds._W, C = Foe.ctx && Foe.ctx(); if (!W || !C || T.spawning) return; T.spawning = true;
    const d = BY[id], node = W.graph.nodes[W.cur], L = lvOf(id), rec = powOf(L);
    try {
      const h = recFor(id, node.loc), P = W.pos, R = (C.R || 20) - 3;
      let best = null; for (let i = 0; i < 14; i++) { const a = Math.random() * 6.283, r = 9 + Math.random() * 5; const x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r; if (Math.hypot(x, z) < R) { best = [x, z]; break; } }
      if (!best) { const a = Math.atan2(-P.x, -P.z); best = [P.x + Math.sin(a) * 8, P.z + Math.cos(a) * 8]; }
      const pos = V3().set(best[0], 0, best[1]);
      banner(d.ic + ' ' + d.n + ' 穿越而来', d.t + ' · Lv.' + L + ' · 战力 ' + rec, '她在的时候，所有的门都被封死了', d.col);
      try { SFX.roar && SFX.roar(0.8); } catch (e) { }
      const fr = window.__forceRole, fa = window.__forceAff; window.__forceRole = d.role; window.__forceAff = d.aff.concat(SS().L[id].esc >= 2 ? ['frenzy'] : []);
      let out; try { out = await Foe.populate(C, [{ h, pos }], { keep: true }); } finally { window.__forceRole = fr; window.__forceAff = fa; }
      const fo = out && out[0]; if (!fo) { T.spawning = false; return; }
      fo.absRec = rec; fo.hunter2 = id; fo.maxHp = fo.hp = Math.round(window.FoeAbs && FoeAbs.on ? HP0 * FoeAbs.hpK(rec) * (d.aff.length ? 1.3 : 1) : HP0 + L * 14);
      fo.iq = 1.25; fo.tier = 0.95; fo.brave = true; fo.seen = true; fo.state = 'chase'; fo.cd = 1 + Math.random(); fo.dmgMul = (fo.dmgMul || 1) * 1.15; fo.spdMul = (fo.spdMul || 1) * 1.08; fo.skPool = d.sk.length ? d.sk : null; fo.skCd = 1.5;
      if (W.foes && !W.foes.includes(fo)) W.foes.push(fo); else if (!W.foes) W.foes = [fo];
      T.fo = fo; T.id = id; T.spawnAt = performance.now(); T.fleeAt = 0; T.sayT = 2; SS().L[id].meet++;
      setTimeout(() => say(fo, d.lines[0]), 900);
    } catch (e) { console.warn('Hunters2 spawn', e); }
    T.spawning = false;
  }
  function say(fo, t) { try { Foe.say(fo, t, BY[fo.hunter2].col); } catch (e) { } }
  function vanish(fo) { // 传送离场（不算死亡）
    fo.dead = true; fo.escaped = true; fo.rag = null; if (fo.warn) fo.warn.visible = false; if (fo.gs) fo.gs.visible = false;
    if (fo.f && fo.f.root && fo.f.root.parent) { const p = fo.f.root.position.clone(); fo.f.root.parent.remove(fo.f.root); try { G_().burst && G_().burst(p.add(V3().set(0, 1, 0)), BY[fo.hunter2].col, 40, 2, 1); } catch (e) { } }
    try { Foe.say(fo, ''); } catch (e) { }
    const W = Worlds._W; if (W && W.foes) { const i = W.foes.indexOf(fo); if (i >= 0) W.foes.splice(i, 1); }
    const i2 = Foe.foes.indexOf(fo); if (i2 >= 0) Foe.foes.splice(i2, 1);
  }
  function endEncounter() { T.fo = null; T.id = null; T.m = 0; T.armedAt = 0; T.cool = performance.now() + 40000; }

  // ================= 主循环 =================
  function tick() {
    const W = window.Worlds && Worlds.active && Worlds._W;
    if (!on() || !W || !W.graph || !W.graph.trip || !window.G || !G.S) { if (hud) hud.root.style.display = 'none'; if (!W) T = null; return; }
    if (!T) newTrip();
    const h = ensureHud(); h.root.style.display = 'block';
    const now = performance.now(), dt = Math.min(1, (now - T.last) / 1000); T.last = now;
    const st = W.stats || {}, k = st.kill || 0, dc = st.decap || 0, s = SS();
    // 仇恨（永久） + 感应（本趟）
    if (k > T.kH) { s.hate += (k - T.kH) * (window.Gear2 ? Gear2.hateMul() : 1); T.m += (k - T.kH) * 7 * (window.Gear2 ? Gear2.senseMul() : 1); T.kH = k; }
    if (dc > T.dH) { s.hate += (dc - T.dH) * 0.5 * (window.Gear2 ? Gear2.hateMul() : 1); T.m += (dc - T.dH) * 4 * (window.Gear2 ? Gear2.senseMul() : 1); T.dH = dc; }
    const node = W.graph.nodes[W.cur], quiet = !node || node.home || node.huntArena || node.eliteArena || (W.boss && !W.boss.dead) || W.busy || W.dead;
    const mins = (now - (T.t0 || (T.t0 = now))) / 60000;
    if (!T.fo && !quiet && now > T.cool) T.m += dt * (0.25 + mins * 0.06) * (window.Gear2 ? Gear2.senseMul() : 1); // 每分钟约 15%，停得越久涨得越快
    T.m = Math.min(100, T.m);
    const al = alive();
    if (!T.fo && !quiet && T.m >= 100 && al.length && now > T.cool) {
      if (!T.armedAt) T.armedAt = now;
      T.rollT -= dt; if (T.rollT <= 0) { T.rollT = 5; const p = Math.min(0.9, 0.15 + (now - T.armedAt) / 60000 * 0.12); if (Math.random() < p) spawn(al[Math.floor(Math.random() * al.length)].id); }
    }
    // 猎手在场
    const fo = T.fo;
    if (fo) {
      const d = BY[T.id];
      if (fo.dead && !fo.escaped) { // 真正斩杀
        s.L[T.id].dead = Date.now(); const c = Math.round(powOf(lvOf(T.id)) * 12); try { G.addCoins && G.addCoins(c); if (W.trip) W.trip.coins += c; } catch (e) { } try { window.Gear2 && Gear2.dropFor(powOf(lvOf(T.id)), 4); } catch (e) { }
        banner('☠ 猎手陨落', d.n + ' · ' + d.t, `她再也不会回来了（剩余猎手 ${alive().length}/4） · +${c}🔮 · 别忘了带走她的首级`, '#ff8a70'); try { G.save(); } catch (e) { } endEncounter();
      } else if (!fo.dead) {
        T.sayT -= dt; if (T.sayT <= 0) { T.sayT = 7 + Math.random() * 6; say(fo, d.lines[1 + Math.floor(Math.random() * (d.lines.length - 2))]); }
        if (!T.fleeAt && fo.hp <= fo.maxHp * FLEE_AT) { T.fleeAt = now; fo.state = 'flee'; fo.brave = false; fo.spdMul = (fo.spdMul || 1) * 1.35; fo.atk = null; say(fo, d.lines[d.lines.length - 1]); try { G.toast(`⚠ ${d.n} 要逃了！${FLEE_T} 秒内打倒她，否则她会变得更强！`, '#ffd070', 2.4); } catch (e) { } }
        if (T.fleeAt) { fo.state = 'flee'; if (now - T.fleeAt > FLEE_T * 1000) { const L0 = lvOf(T.id); s.L[T.id].esc++; vanish(fo); banner('💨 ' + d.n + ' 逃走了', `Lv.${L0} → Lv.${lvOf(T.id)}（逃脱成长）`, '她会带着更强的力量回来。下次要在她逃跑前一口气打完。', d.col); try { G.save(); } catch (e) { } endEncounter(); } }
        else if (now - T.spawnAt > STAY_T * 1000) { vanish(fo); s.L[T.id].wd++; banner('…' + d.n + ' 暂时撤退了', '门的封锁解除了', '她没有变强，但她还会再来。', '#c8c8c8'); endEncounter(); }
      } else endEncounter();
    }
    drawHud(W, now);
  }

  // ================= 门封锁 =================
  function wrap() {
    if (window.Worlds && !Worlds.__h2) {
      const k0 = Worlds.onKey; Worlds.onKey = function (e) {
        const W = Worlds._W;
        if (on() && T && T.fo && !T.fo.dead && W && e.code === 'KeyE' && !e.repeat && W.doorNear) { try { G.toast(`🔒 ${BY[T.id].n} 在这里——门被封死了，打倒她或者撑到她撤退！`, '#ff9070', 2); } catch (x) { } return true; }
        return k0.apply(this, arguments);
      };
      const s0 = Worlds.start; Worlds.start = function () { const r = s0.apply(this, arguments); try { newTrip(); } catch (e) { } return r; };
      Worlds.__h2 = 1;
    }
  }

  // ================= HUD =================
  let hud = null;
  function ensureHud() {
    if (hud) return hud;
    const s = document.createElement('style'); s.textContent = `
#h2Hud{position:fixed;inset:0;pointer-events:none;z-index:34;display:none}
#h2Sense{position:absolute;left:14px;top:196px;width:210px;font-size:11.5px;color:#e8d0c8;text-shadow:0 1px 3px #000;letter-spacing:1px}
#h2Sense .b{height:5px;margin-top:3px;background:#0009;border-radius:3px;overflow:hidden}#h2Sense i{display:block;height:100%;width:0;background:linear-gradient(90deg,#6a3a8a,#ff4a6a);transition:width .3s}
#h2Sense.full i{animation:h2p .8s infinite}@keyframes h2p{50%{opacity:.5}}#h2Sense small{opacity:.75}
#h2Bar{position:absolute;top:58px;left:50%;transform:translateX(-50%);width:min(520px,70vw);display:none;text-align:center;text-shadow:0 1px 4px #000;color:#fff}
#h2Bar .n{font-size:16px;font-weight:800;letter-spacing:2px}#h2Bar .t{font-size:11.5px;opacity:.85}
#h2Bar .hp{height:9px;background:#0009;border:1px solid #fff4;border-radius:5px;overflow:hidden;margin:4px 0 2px}#h2Bar .hp i{display:block;height:100%;background:linear-gradient(90deg,#c02040,#ff7090);transition:width .15s}
#h2Bar .hp b{display:block;height:100%}#h2Bar .g{font-size:12px}#h2Bar .fl{color:#ffd070;font-weight:800;font-size:15px;animation:h2p .5s infinite}
#h2Ban{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);opacity:0;transition:opacity .5s;text-align:center;color:#fff;text-shadow:0 2px 12px #000;padding:16px 40px;background:radial-gradient(ellipse at center,#12060ae8 30%,#12060a00 72%)}
#h2Ban.on{opacity:1}#h2Ban .a{font-size:26px;font-weight:900;letter-spacing:3px}#h2Ban .b{font-size:15px;margin:4px 0;color:#ffe0d0}#h2Ban .c{font-size:13px;color:#e0c8c0}`;
    document.head.appendChild(s);
    const d = document.createElement('div'); d.id = 'h2Hud'; d.innerHTML = '<div id="h2Sense"></div><div id="h2Bar"></div><div id="h2Ban"></div>';
    document.body.appendChild(d); hud = { root: d, sense: d.querySelector('#h2Sense'), bar: d.querySelector('#h2Bar'), ban: d.querySelector('#h2Ban') };
    return hud;
  }
  function banner(a, b, c, col) { const h = ensureHud(); h.ban.innerHTML = `<div class="a" style="color:${col || '#fff'}">${esc(a)}</div><div class="b">${esc(b)}</div><div class="c">${esc(c)}</div>`; h.ban.classList.add('on'); clearTimeout(h._t); h._t = setTimeout(() => h.ban.classList.remove('on'), 4800); }
  function drawHud(W, now) {
    const h = hud, s = SS(), al = alive().length;
    if (!al) { h.sense.innerHTML = '🏹 四名猎手已全部斩杀'; h.bar.style.display = 'none'; return; }
    const full = T.m >= 100;
    h.sense.className = full ? 'full' : ''; h.sense.innerHTML = `🏹 猎手感应 ${Math.floor(T.m)}%${full ? ' <b style="color:#ff7090">· 随时会来</b>' : ''}<div class="b"><i style="width:${T.m}%"></i></div><small>仇恨 ${Math.floor(s.hate)} · 再 ${Math.ceil(HATE_STEP - s.hate % HATE_STEP)} 点全员升级 · U 查看猎手</small>`;
    const fo = T.fo;
    if (fo && !fo.dead) {
      const d = BY[T.id], L = lvOf(T.id), o = odds(T.id), fl = T.fleeAt ? Math.max(0, FLEE_T - (now - T.fleeAt) / 1000) : 0;
      h.bar.style.display = 'block';
      h.bar.innerHTML = `<div class="n" style="color:${d.col}">${d.ic} ${esc(d.n)} <span style="font-size:12px">Lv.${L}</span></div><div class="t">${esc(d.t)} · 战力 ${o.rec} vs 你 ${myPow()} · 胜率约 ${Math.round(o.p * 100)}%</div>
<div class="hp"><i style="width:${Math.max(0, fo.hp / fo.maxHp * 100)}%"></i></div>${fl ? `<div class="fl">她在逃跑！${fl.toFixed(1)} 秒</div>` : `<div class="g">血量 30% 时她会逃跑 · 🔒 门已封锁 · ${Math.max(0, Math.ceil(STAY_T - (now - T.spawnAt) / 1000))} 秒后撤退</div>`}`;
    } else h.bar.style.display = 'none';
  }

  // ================= 档案面板（U）=================
  let pn = null;
  function panelHTML() {
    const s = SS(), mp = myPow();
    return `<div class="h2p-h"><b>🏹 食人魔猎手</b><span>仇恨 ${Math.floor(s.hate)} · 每 ${HATE_STEP} 点仇恨四人全部 +1 级 · 逃走一次该人 +1 级 · 你的战力 <b>${mp}</b></span><i data-x>✕</i></div>
<div class="h2p-g">${D.map(d => { const L = s.L[d.id], lv = lvOf(d.id), pw = powOf(lv), o = odds(d.id), gap = pw - mp, dead = !!L.dead;
      return `<div class="h2p-c ${dead ? 'dead' : ''}" style="--c:${d.col}"><div class="h2p-n">${d.ic} ${esc(d.n)}${dead ? ' <em>☠ 已斩杀</em>' : ''}</div><div class="h2p-t">「${esc(d.t)}」</div>
<div class="h2p-s"><span>等级 <b>Lv.${lv}</b></span><span>战力 <b>${pw}</b></span><span>差距 <b style="color:${gap > 0 ? '#ff8a7a' : '#9fe89f'}">${gap > 0 ? '她强 ' + gap : '你强 ' + (-gap)}</b></span></div>
${dead ? '' : `<div class="h2p-o"><div class="bar"><i style="width:${Math.round(o.p * 100)}%"></i></div>预估胜率 <b>${Math.round(o.p * 100)}%</b> · 你约 ${o.my} 刀砍倒她 · 她约 ${o.her} 下打倒你</div>`}
<div class="h2p-f">等级 = 基础 ${d.base} + 仇恨 ${Math.floor(s.hate / HATE_STEP)} + 逃脱 ${L.esc}　·　遭遇 ${L.meet} 次</div>
<p>${esc(d.bio)}</p><p class="h2p-st">⚔ ${esc(d.style)}</p></div>`; }).join('')}</div>
<div class="h2p-foot">出猎时「猎手感应」满了就可能有人穿越过来（洞穴和洞口不会）。她在场时门全部封锁。血量掉到 30% 她会逃跑——3.2 秒内打死她才算真正斩杀。</div>`;
  }
  function toggle(v) {
    if (!pn) {
      const s = document.createElement('style'); s.textContent = `
#h2Pn{position:fixed;inset:5% 6%;z-index:66;background:rgba(14,8,10,.96);border:1px solid #a0606a88;border-radius:14px;color:#eee;font:13px/1.55 inherit;overflow:auto;padding:14px 18px;display:none}
#h2Pn.on{display:block}.h2p-h{display:flex;gap:12px;align-items:baseline;margin-bottom:10px}.h2p-h b{font-size:18px;color:#ffb0a0}.h2p-h span{opacity:.8;flex:1}.h2p-h i{cursor:pointer;font-style:normal;font-size:18px}
.h2p-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}.h2p-c{border:1px solid var(--c);border-radius:10px;padding:10px 12px;background:linear-gradient(160deg,#ffffff0a,#0000)}
.h2p-c.dead{opacity:.55;filter:grayscale(.7)}.h2p-n{font-size:16px;font-weight:800;color:var(--c)}.h2p-n em{font-style:normal;color:#ff8a7a;font-size:12px}.h2p-t{opacity:.8;margin-bottom:4px}
.h2p-s{display:flex;gap:12px;flex-wrap:wrap}.h2p-o{margin:5px 0}.h2p-o .bar{height:6px;background:#0008;border-radius:3px;overflow:hidden;margin-bottom:2px}.h2p-o .bar i{display:block;height:100%;background:linear-gradient(90deg,#c04040,#e0c040,#60c060)}
.h2p-f{font-size:11.5px;color:#c8b0a8}.h2p-c p{margin:5px 0;font-size:12.5px;color:#ddd}.h2p-st{color:#ffd0a0!important}.h2p-foot{margin-top:10px;font-size:12px;opacity:.75}`;
      document.head.appendChild(s); pn = document.createElement('div'); pn.id = 'h2Pn'; document.body.appendChild(pn);
      pn.addEventListener('click', e => { if (e.target.closest('[data-x]')) toggle(false); });
      ['mousedown', 'pointerdown', 'wheel'].forEach(ev => pn.addEventListener(ev, e => e.stopPropagation()));
    }
    const open = v == null ? !pn.classList.contains('on') : v; if (open) pn.innerHTML = panelHTML(); pn.classList.toggle('on', open);
    try { if (open) G.setUI(true); else if (!(window.Worlds && Worlds.active)) { G.setUI(false); G.lockPointer && G.lockPointer(); } else G.setUI(false); } catch (e) { }
  }
  addEventListener('keydown', e => { if (!on() || !window.G || !G.S) return; if (e.code === 'KeyU' && !e.repeat && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) { e.preventDefault(); toggle(); } else if (e.code === 'Escape' && pn && pn.classList.contains('on')) { e.stopImmediatePropagation(); toggle(false); } }, true);

  wrap(); setTimeout(wrap, 0); addEventListener('load', wrap);
  setInterval(() => { try { tick(); } catch (e) { console.warn('Hunters2 tick', e); } }, 100);
  return { on, D, BY, SS, lvOf, powOf, odds, alive, spawn: id => spawn(id), toggle, get T() { return T; }, HATE_STEP };
})();
