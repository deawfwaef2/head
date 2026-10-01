// R54h 三个 MOD（默认开），把系统拧成一个循环：出猎（杀/斩首）→ 首级（摆出来 = 永久微弱加成 + 产魂晶）→ 魂晶（装备 / 血祭强化下一趟）→ 更高等级地区；
// 洞里待久了宿敌必来、宿敌随时间越来越强 → 逼你出门变强。
// nemesis   ：4 名食人魔猎手 + 月之巫女（最终决战前只是分身）是你的宿敌。每玩 8 分钟猎手全体 +1 级；在洞里待着「宿敌逼近」会涨（约 5 分钟满），
//             满了下一趟第一个地点 100% 遭遇宿敌（没满按比例）；出猎中每 4~7 分钟宿敌主动来袭；猎手死光或逼近满时有 30% 是月之巫女的分身（能杀）。
// soul_rite ：出洞选地点时可用魂晶做「血祭」——只对下一趟有效的伤害 / 生命 / 移速强化。
// head_boon ：每颗摆在建筑上的首级都给一点点永久加成（伤害 / 生命 / 移速三种之一，阶位越高越多，总共最多 +12%）。
window.Nemesis = (() => {
  const onN = () => !window.Mods || Mods.on('nemesis') !== false, onR = () => !window.Mods || Mods.on('soul_rite') !== false, onH = () => !window.Mods || Mods.on('head_boon') !== false;
  const G = () => window.G, W = () => (window.Worlds && Worlds.active ? Worlds._W : null);
  function S() { const s = G().S; s.nem = s.nem || { p: 0, play: 0, grow: 0, buff: null, act: null }; return s.nem; }
  const plv = () => { try { return RPG.lvOf(G().S.xp).lv; } catch (e) { return 1; } };
  // ---------- 首级加成 ----------
  let hc = { t: 0, v: { dmg: 0, hp: 0, spd: 0 } };
  function heads() {
    const now = performance.now(); if (now - hc.t < 3000) return hc.v; hc.t = now; const v = { dmg: 0, hp: 0, spd: 0 };
    if (onH()) try { for (const h of (G().heads || [])) { if (!h || !h.mount || !h.rec) continue; const rr = (h.rec.c && h.rec.c.rar) || 0, k = ['dmg', 'hp', 'spd'][(h.rec.id | 0) % 3]; v[k] += 0.0015 + 0.001 * rr; } } catch (e) { }
    for (const k in v) v[k] = Math.min(0.12, v[k]); hc.v = v; return v;
  }
  const act = () => (onR() && S().act) || {};
  const dmgK = () => (1 + (act().dmg || 0)) * (1 + heads().dmg), hpK = () => (1 + (act().hp || 0)) * (1 + heads().hp), spdK = () => (1 + (act().spd || 0)) * (1 + heads().spd);
  if (window.RPG && RPG.stats && !RPG.stats.__nem) { const s0 = RPG.stats; RPG.stats = function () { const s = s0.apply(this, arguments); try { if (s && s.maxHp && G() && G().S) s.maxHp = Math.round(s.maxHp * hpK()); } catch (e) { } return s; }; RPG.stats.__nem = 1; }
  // ---------- 血祭（选地点面板里）----------
  const RITE = [['dmg', 0.15, '⚔️ 力量血祭', '下一趟伤害 +15%'], ['hp', 0.2, '❤️ 血肉血祭', '下一趟生命上限 +20%'], ['spd', 0.1, '💨 疾风血祭', '下一趟移速 +10%']];
  const cost = () => Math.round(60 * (1 + plv() * 0.25));
  function riteHTML() {
    const b = S().buff || {}, c = cost(), coins = G().S.coins | 0, hv = heads();
    return `<div class="nb-h">🩸 出发前的血祭 <small>（魂晶 ${coins} · 每项 🔮${c} · 只对下一趟有效）</small></div><div class="nb-r">${RITE.map(([k, v, n, d]) => `<button data-nr="${k}" ${b[k] ? 'class="on"' : coins < c ? 'disabled' : ''}><b>${n}</b><span>${b[k] ? '✔ 已献祭' : d}</span></button>`).join('')}</div>
<div class="nb-f">首级加成（摆出来的首级）：伤害 +${(hv.dmg * 100).toFixed(1)}% · 生命 +${(hv.hp * 100).toFixed(1)}% · 移速 +${(hv.spd * 100).toFixed(1)}%　｜　🩸 宿敌逼近 ${Math.round(S().p)}%${S().p >= 100 ? '（下一趟必遇宿敌）' : ''}</div>
<div class="nb-l">循环：出猎斩首 → 首级摆出来（永久小加成 + 产魂晶）→ 魂晶买装备 / 血祭 → 去更高等级的地区；洞里待久了宿敌必来，而且越来越强。</div>`;
  }
  function css() { if (document.getElementById('nemCss')) return; const s = document.createElement('style'); s.id = 'nemCss'; s.textContent = `
#nemBuff{margin:10px 0 14px;padding:10px 14px;border:1px solid rgba(232,205,160,.25);background:linear-gradient(90deg,#1a0c10cc,#0b0709cc);border-radius:4px}
#nemBuff .nb-h{font-weight:700;letter-spacing:.08em;color:#ffcfb0;margin-bottom:8px}#nemBuff .nb-h small{font-weight:400;color:#b8a890;letter-spacing:0}
#nemBuff .nb-r{display:flex;gap:8px;flex-wrap:wrap}#nemBuff button{flex:1;min-width:150px;padding:8px 10px;border-radius:3px;border:1px solid #7a3a3a;background:linear-gradient(#2a1214,#140809);color:#f0dcc8;cursor:pointer;text-align:left}
#nemBuff button b{display:block;font-size:14px}#nemBuff button span{font-size:12px;color:#c8b098}#nemBuff button.on{border-color:#e1c07e;background:linear-gradient(#3a2414,#1a0e08)}#nemBuff button:disabled{opacity:.45;cursor:not-allowed}
#nemBuff .nb-f{margin-top:8px;font-size:12px;color:#d8c8a8}#nemBuff .nb-l{margin-top:4px;font-size:12px;color:#9a8c78}
#nemChip{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:33;pointer-events:none;padding:4px 14px;font:600 13px "Microsoft YaHei UI",sans-serif;letter-spacing:.06em;color:#ffd0c0;background:linear-gradient(90deg,transparent,#1a0808d0 20%,#1a0808d0 80%,transparent);display:none}
#nemChip i{display:inline-block;width:120px;height:4px;margin-left:8px;vertical-align:middle;background:#0008;border:1px solid #ff6a5a55}#nemChip i b{display:block;height:100%;background:linear-gradient(90deg,#a01828,#ff5a4a)}
#nemChip.full{animation:nemP 1s infinite}@keyframes nemP{50%{color:#fff;text-shadow:0 0 10px #ff4a3a}}`; document.head.appendChild(s); }
  function inject() {
    if (!onR()) return; const locs = document.querySelector('.rq-pick') || document.querySelector('.locs'); if (!locs || !locs.offsetParent || document.getElementById('nemBuff')) return; css();
    const d = document.createElement('div'); d.id = 'nemBuff'; d.innerHTML = riteHTML(); locs.parentNode.insertBefore(d, locs);
    d.addEventListener('click', e => { const b = e.target.closest('[data-nr]'); if (!b || b.disabled) return; e.stopPropagation(); const k = b.dataset.nr, R = RITE.find(x => x[0] === k), s = S(), c = cost();
      if ((s.buff || {})[k]) return; if ((G().S.coins | 0) < c) return; G().addCoins(-c); s.buff = Object.assign({}, s.buff || {}, { [k]: R[1] }); try { SFX.coins && SFX.coins(); G().toast(`${R[2]}：${R[3]}`, '#ffb0a0', 2); G().save && G().save(); } catch (e2) { } d.innerHTML = riteHTML(); });
  }
  // ---------- 宿敌 ----------
  let wasW = null, plan = null, chip = null;
  function chipUI(show) { if (!chip) { css(); chip = document.createElement('div'); chip.id = 'nemChip'; document.body.appendChild(chip); } chip.style.display = show ? 'block' : 'none'; if (!show) return; const p = S().p; chip.classList.toggle('full', p >= 100); chip.innerHTML = `🩸 宿敌逼近 ${Math.round(p)}%<i><b style="width:${Math.min(100, p)}%"></b></i>`; }
  async function clone() {
    const w = W(), C = window.Foe && Foe.ctx(); if (!w || !C || !w.B || C.sc !== w.B.sc) return false;
    const loc = (window.Lore && Lore.LOCS.find(l => l.k === 'peak')) || w.graph.loc; let h; try { h = RPG.foe(G().S, loc, (Math.random() * 4294967296) >>> 0, G().usedNames, G().usedSig); } catch (e) { return false; } if (!h) return false;
    h.c.name = '塞勒涅之影'; h.c.title = '月之巫女的分身'; h.c.rar = 4;
    const a = Math.random() * 6.28, pos = new THREE.Vector3(w.pos.x + Math.sin(a) * 10, 0, w.pos.z + Math.cos(a) * 10); if (w.B.lp && w.B.lp.clamp) w.B.lp.clamp(pos, 1.5); else { const r = Math.hypot(pos.x, pos.z), lim = (w.B.R || 20) - 3; if (r > lim) { pos.x *= lim / r; pos.z *= lim / r; } }
    const out = await Foe.populate(C, [{ h, pos }], { keep: true }); const fo = out && out[0]; if (!fo) return false;
    fo.maxHp = fo.hp = Math.round(fo.maxHp * 3.2); fo.tier = 3; fo.lvl = plv() + 6; fo.brave = true; fo.iq = 1.3; fo.nemClone = 1; fo.seen = true; fo.state = 'chase'; fo._liv = 1;
    if (!w.foes) w.foes = Foe.foes; else if (!w.foes.includes(fo)) w.foes.push(fo);
    try { G().toast('🌙 月光骤冷——「塞勒涅之影」从雾里走了出来。她只是分身……但足够杀死你。', '#d8d0ff', 4); SFX.roar && SFX.roar(0.7); G().flash && G().flash('#2a2050', 0.5, 600); } catch (e) { }
    return true;
  }
  async function strike(reason) {
    const w = W(); if (!w || w.busy || !w.B || w.B.corr || w.dead) return false; const H2 = window.Hunters2, C = window.Foe && Foe.ctx(); if (!C || C.sc !== w.B.sc) return false;
    const al = H2 && H2.on && H2.on() ? H2.alive() : []; if (H2 && H2.T && H2.T.fo && !H2.T.fo.dead) return false;
    if (!al.length || Math.random() < 0.3) return clone();
    try { await H2.spawn(al[Math.floor(Math.random() * al.length)].id); const fo = H2.T && H2.T.fo; if (fo) { if (!w.foes) w.foes = Foe.foes; else if (!w.foes.includes(fo)) w.foes.push(fo); fo.seen = true; fo.state = 'chase'; } return true; } catch (e) { console.warn('nemesis', e); return false; }
  }
  function tick() {
    if (!G() || !G().S) return; const s = S(), w = W(), dt = 1;
    if (G().playing) { s.play += dt; if (onN() && s.play - s.grow >= 480 && window.Hunters2 && Hunters2.SS) { s.grow = s.play; const H2 = Hunters2.SS(); H2.hate += Hunters2.HATE_STEP || 15; try { G().toast('🩸 宿敌们在你看不见的地方又变强了（猎手全体 +1 级）', '#ff9a8a', 2.8); } catch (e) { } } }
    if (w !== wasW) { // 出发 / 回洞
      if (w && !wasW) { plan = onN() ? { first: s.p >= 100 || Math.random() * 100 < s.p, next: performance.now() / 1000 + 240 + Math.random() * 180, enteredAt: 0 } : null; s.p = 0; if (onR()) { s.act = s.buff || null; s.buff = null; } }
      if (!w && wasW) { s.act = null; plan = null; }
      wasW = w;
    }
    if (!w) { if (onN() && G().playing && !G().uiOpen) { s.p = Math.min(100, s.p + 100 / 300); chipUI(true); } else chipUI(!!(onN() && G().playing)); inject(); return; }
    chipUI(false);
    if (!plan || !onN()) return; const now = performance.now() / 1000;
    if (w.busy || !w.B || w.B.corr) { plan.enteredAt = 0; return; } if (!plan.enteredAt) plan.enteredAt = now;
    if (plan.first && now - plan.enteredAt > 6) { plan.first = false; strike('first').catch(() => { }); }
    else if (now > plan.next && now - plan.enteredAt > 10) { plan.next = now + 240 + Math.random() * 180; strike('periodic').catch(() => { }); }
  }
  setInterval(() => { try { tick(); } catch (e) { } }, 1000);
  return { dmgK, hpK, spdK, heads, strike, S };
})();
