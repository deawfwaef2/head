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
  const LP = () => (window.Loop && Loop.on() ? Loop : null); // R54i run_loop：世道倍率
  const dmgK = () => (1 + (act().dmg || 0)) * (1 + heads().dmg) * (LP() ? LP().runDmg() : 1), hpK = () => (1 + (act().hp || 0)) * (1 + heads().hp) * (LP() ? LP().runHp() : 1), spdK = () => (1 + (act().spd || 0)) * (1 + heads().spd) * (LP() ? LP().runSpd() : 1);
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
#nemBuff.nb-side{position:fixed;left:16px;top:70px;z-index:130;width:min(320px,26vw);margin:0;padding:14px 16px;background:linear-gradient(160deg,rgba(34,14,16,.95),rgba(10,6,7,.95));border:1px solid #6a2a2a;border-left:3px solid #ff8a7a;border-radius:0;box-shadow:0 10px 30px #0009;font:13.5px/1.6 "Microsoft YaHei UI",sans-serif;color:#eadcc4;animation:nbIn .35s ease-out}
@keyframes nbIn{from{opacity:0;transform:translateX(-24px)}}
#nemBuff.nb-side .nb-h{font:700 15px "Noto Serif SC",serif;letter-spacing:.12em;color:#ffb0a0;margin-bottom:8px}
#nemBuff.nb-side .nb-h small{display:block;font:12px sans-serif;letter-spacing:0;color:#b8a890;margin-top:2px}
#nemBuff.nb-side .nb-r{flex-direction:column;gap:6px}
#nemBuff.nb-side button{min-width:0;width:100%;padding:8px 10px}
#nemBuff.nb-side button:not(:disabled):hover{border-color:#ff9a8a;background:linear-gradient(#3a1618,#1c0a0b)}
#nemBuff.nb-side .nb-f{border-top:1px solid #ffffff14;padding-top:8px;line-height:1.7}
#nemChip{position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:33;pointer-events:none;padding:4px 14px;font:600 13px "Microsoft YaHei UI",sans-serif;letter-spacing:.06em;color:#ffd0c0;background:linear-gradient(90deg,transparent,#1a0808d0 20%,#1a0808d0 80%,transparent);display:none}
#nemChip i{display:inline-block;width:120px;height:4px;margin-left:8px;vertical-align:middle;background:#0008;border:1px solid #ff6a5a55}#nemChip i b{display:block;height:100%;background:linear-gradient(90deg,#a01828,#ff5a4a)}
#nemChip.full{animation:nemP 1s infinite}@keyframes nemP{50%{color:#fff;text-shadow:0 0 10px #ff4a3a}}`; document.head.appendChild(s); }
  function inject() {
    if (!onR()) return; const locs = document.querySelector('.rq-pick') || document.querySelector('.locs'), side = !window.Mods || Mods.on('rite_panel') !== false; let d0 = document.getElementById('nemBuff');
    if (side) { if (!locs || !locs.offsetParent || W()) { if (d0) d0.remove(); return; } if (d0) { if (d0._c !== (G().S.coins | 0)) { d0._c = G().S.coins | 0; d0.innerHTML = riteHTML(); } return; } } /* R57 rite_panel：血祭不再塞进地区选择界面，单独一张面板（左侧，和 loop.js 右侧 #lpSide 对称） */
    else if (!locs || !locs.offsetParent || d0) return; css();
    const d = document.createElement('div'); d.id = 'nemBuff'; d.innerHTML = riteHTML(); if (side) { d.className = 'nb-side'; d._c = G().S.coins | 0; document.body.appendChild(d); } else locs.parentNode.insertBefore(d, locs);
    d.addEventListener('click', e => { const b = e.target.closest('[data-nr]'); if (!b || b.disabled) return; e.stopPropagation(); const k = b.dataset.nr, R = RITE.find(x => x[0] === k), s = S(), c = cost();
      if ((s.buff || {})[k]) return; if ((G().S.coins | 0) < c) return; G().addCoins(-c); s.buff = Object.assign({}, s.buff || {}, { [k]: R[1] }); try { SFX.coins && SFX.coins(); G().toast(`${R[2]}：${R[3]}`, '#ffb0a0', 2); G().save && G().save(); } catch (e2) { } d.innerHTML = riteHTML(); });
  }
  // ---------- 宿敌 ----------
  let wasW = null, plan = null, chip = null;
  function chipUI(show) { if (!chip) { css(); chip = document.createElement('div'); chip.id = 'nemChip'; document.body.appendChild(chip); } chip.style.display = show ? 'block' : 'none'; if (!show) return; const p = S().p; chip.classList.toggle('full', p >= 100);
    const H = window.HudTidy && HudTidy.on() && window.Hunters2 && Hunters2.on() && Hunters2.T && Hunters2.alive().length ? Hunters2.T : null, hm = H ? Math.floor(H.m || 0) : -1; // R54n：猎手感应并入宿敌条
    let gr = ''; try { const H2 = window.Hunters2, hs = H2 && H2.SS && H2.on && H2.on() ? H2.SS() : null; if (hs) { const stp = H2.HATE_STEP || 15, f = (hs.hate % stp) / stp, rem = Math.ceil((1 - f) * 480), lvp = Math.floor(hs.hate / stp); gr = `<span style="margin-left:14px;color:#ffb070">📈 宿敌成长 +${lvp} 级</span><i><b style="width:${(f * 100).toFixed(1)}%;background:linear-gradient(90deg,#8a3a10,#ffb070)"></b></i><span style="margin-left:4px;font-size:11.5px;color:#c8b8a8">${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, '0')} 后再升一级</span>`; } } catch (e) { }
    chip.innerHTML = `🩸 宿敌逼近 ${Math.round(p)}%<i><b style="width:${Math.min(100, p)}%"></b></i>${gr}${hm >= 0 ? `<span style="margin-left:14px;color:${hm >= 100 ? '#ff7a6a' : '#e7c27a'}">🏹 猎手 ${hm}%${hm >= 100 ? ' · 随时会来' : ''}</span><i><b style="width:${Math.min(100, hm)}%;background:linear-gradient(90deg,#7a5a20,#e7c27a)"></b></i>` : ''}<span style="margin-left:12px;font-size:11.5px;color:#c8b8a8">U 档案</span>`; }
  // R54p：宿敌档案（并入 U 猎手档案窗口底部）
  function dossierHTML() {
    if (!onN()) return ''; const s = S(), ex = s.extra || [], pl = plv(), e2 = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const card = (ic, nm, sub, lv, lines, col) => `<div style="padding:12px 14px;background:linear-gradient(160deg,#2a1414e8,#0e0808f0);border:1px solid ${col}66;border-left:3px solid ${col}"><div style="font:800 17px 'Noto Serif SC',serif;color:${col}">${ic} ${e2(nm)} <span style="font:600 12px sans-serif;color:#e8d8c0">${lv ? `Lv.${lv}${lv - pl >= 4 ? ' · <b style="color:#ff7a6a">危险</b>' : ''}` : ''}</span></div><div style="font-size:12px;color:#c8b8a8;margin:2px 0 6px">${e2(sub)}</div>${lines.map(l => `<div style="font-size:13px;color:#eadcc4;line-height:1.6">${l}</div>`).join('')}</div>`;
    const cs = [card('🌙', '塞勒涅之影', '月之巫女的分身', pl + 6, ['宿敌逼近满了就可能从雾里走出来。', '她在场时门会封锁 90 秒；她残血会撤退，8 秒内追上还能斩首。'], '#c8b8ff')];
    for (const x of ex) { const c = (x.h && x.h.c) || {}, grow = Math.floor(((s.play || 0) - (x.at || 0)) / 300), tr = (c.traits || []).slice(0, 3).join(' · ');
      cs.push(card('🩸', x.n, [c.title, tr].filter(Boolean).join(' · ') || '从你手里逃掉的人', x.lv + grow, [`为什么记住你：她从你手里活着逃走了。`, `离上次见面又变强了 <b>${grow}</b> 级（每过 5 分钟 +1）。`, `阶位：${x.t >= 3 ? '精英' : x.t >= 2 ? '老兵' : '战士'}。打败她 = 她从名单里消失。`, window.NemStory && NemStory.buffHTML ? NemStory.buffHTML('x:' + x.n) : ''], '#ff8a7a')); }
    return `<div style="margin-top:16px"><div style="font:800 18px 'Noto Serif SC',serif;color:#ff9a8a;letter-spacing:.2em;margin-bottom:4px">🩸 宿敌档案</div><div style="font-size:12.5px;color:#b8a890;margin-bottom:8px">宿敌逼近 <b style="color:#ffb0a0">${Math.round(s.p || 0)}%</b> · 老兵以上的敌人从你手里逃掉就会变成宿敌（最多 6 人）。${ex.length ? '' : '目前还没有人记住你的脸。'}</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">${cs.join('')}</div></div>`;
  }
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
  // R54i：被你逃掉的老兵以上敌人 → 新宿敌（最多 6 个），每次你去别处她都在变强
  function addFoe(fo) {
    if (!onN() || !fo || !fo.h || fo._nemAdded) return; fo._nemAdded = 1; const s = S(); s.extra = s.extra || [];
    const nm = (fo.h.c && fo.h.c.name) || '无名者'; if (s.extra.some(x => x.n === nm)) return; if (s.extra.length >= 6) s.extra.shift();
    s.extra.push({ n: nm, h: JSON.parse(JSON.stringify(fo.h)), lv: (fo.lvl || plv()) + 1, t: Math.max(1, fo.tier || 1), at: s.play });
    try { G().toast(`👁 ${nm} 记住了你的脸——她成了你的新宿敌，会变强并找上门来`, '#ffb0a0', 3.4); } catch (e) { }
  }
  // R64：宿敌强度随仇恨值上升（仇恨 = 你放倒/斩首的人越多越高；也随时间连续涨）
  const hateNow = () => { try { return (window.Hunters2 && Hunters2.SS && Hunters2.SS().hate) || 0; } catch (e) { return 0; } };
  const hateHp = () => (1 + Math.min(3.5, hateNow() / 40)) * (window.Diff ? Diff.hp() : 1), hateDmg = () => 1 + Math.min(1.8, hateNow() / 55);
  async function extraStrike() {
    const w = W(), s = S(), C = window.Foe && Foe.ctx(); if (!w || !C || !w.B || C.sc !== w.B.sc || !(s.extra && s.extra.length)) return false;
    const i = Math.floor(Math.random() * s.extra.length), x = s.extra[i], grow = Math.floor((s.play - x.at) / 300);
    const a = Math.random() * 6.28, pos = new THREE.Vector3(w.pos.x + Math.sin(a) * 11, 0, w.pos.z + Math.cos(a) * 11); if (w.B.lp && w.B.lp.clamp) w.B.lp.clamp(pos, 1.5); else { const r = Math.hypot(pos.x, pos.z), lim = (w.B.R || 20) - 3; if (r > lim) { pos.x *= lim / r; pos.z *= lim / r; } }
    const fa0 = window.__forceAff, naf = window.NemStory ? NemStory.aff('x:' + x.n) : []; if (naf.length) window.__forceAff = naf; let out; try { out = await Foe.populate(C, [{ h: x.h, pos }], { keep: true }); } finally { window.__forceAff = fa0; } const fo = out && out[0]; if (!fo) return false;
    const lv = x.lv + grow, d = lv - plv(); fo.lvl = lv; fo.tier = Math.min(3, x.t + (grow >= 2 ? 1 : 0)); fo.maxHp = fo.hp = Math.round((26 + fo.rar * 16) * 3.2 * hateHp() * Math.max(0.8, Math.min(4, Math.pow(1.1, d)))); fo.dmgMul = Math.max(0.8, Math.min(3, Math.pow(1.07, d))) * 1.15 * hateDmg();
    fo.brave = true; fo.iq = 1.25; fo.nemX = 1; fo.nemIdx = x.n; fo.seen = true; fo.state = 'chase'; fo._liv = 1; if (!w.foes) w.foes = Foe.foes; else if (!w.foes.includes(fo)) w.foes.push(fo); if (window.NemStory) try { NemStory.apply(fo, 'x:' + x.n, C, pos); } catch (e) { console.warn('NemStory apply', e); } /* R57 */
    try { G().toast(`🩸 宿敌「${x.n}」追来了 · Lv.${lv}${grow ? `（比上次强了 ${grow} 级）` : ''}${window.Diff && Diff.voice('nem') ? ' · ' + Diff.voice('nem') : ''}`, '#ff9a8a', 3.4); SFX.roar && SFX.roar(0.5); } catch (e) { }
    return true;
  }
  async function strike(reason) {
    const w = W(); if (!w || w.busy || !w.B || w.B.corr || w.dead) return false; const H2 = window.Hunters2, C = window.Foe && Foe.ctx(); if (!C || C.sc !== w.B.sc) return false;
    if (LP() && LP().isBossTrip()) return false; // BOSS 战时宿敌不来
    const al = H2 && H2.on && H2.on() ? H2.alive() : []; if (H2 && H2.T && H2.T.fo && !H2.T.fo.dead) return false;
    const ex = (S().extra || []).length; if (ex && Math.random() < ex / (ex + al.length + 1)) return extraStrike();
    if (!al.length || Math.random() < 0.3) return clone();
    try { await H2.spawn(al[Math.floor(Math.random() * al.length)].id); const fo = H2.T && H2.T.fo; if (fo) { if (!w.foes) w.foes = Foe.foes; else if (!w.foes.includes(fo)) w.foes.push(fo); fo.seen = true; fo.state = 'chase'; } return true; } catch (e) { console.warn('nemesis', e); return false; }
  }
  function tick() {
    if (!G() || !G().S) return; const s = S(), w = W(), dt = 1;
    if (G().playing) { s.play += dt; if (onN() && window.Hunters2 && Hunters2.SS) { const H2 = Hunters2.SS(), stp = Hunters2.HATE_STEP || 15, b0 = Math.floor(H2.hate / stp); H2.hate += stp / 480 * dt * (window.Diff ? Diff.nem() : 1); /* 每 8 分钟 +1 级，改成每秒连续积累（条可见） */ if (Math.floor(H2.hate / stp) > b0) { s.grow = s.play; try { G().toast(window.NemStory && NemStory.on() ? '🩸 宿敌们在你看不见的地方又变强了——走回洞口（或魂门）时，你会看到发生了什么' : '🩸 宿敌们在你看不见的地方又变强了（猎手全体 +1 级）', '#ff9a8a', 2.8); } catch (e) { } } } }
    if (w !== wasW) { // 出发 / 回洞
      if (w && !wasW) { plan = onN() ? { first: s.p >= 100 || Math.random() * 100 < s.p, next: performance.now() / 1000 + 240 + Math.random() * 180, enteredAt: 0 } : null; s.p = 0; if (onR()) { s.act = s.buff || null; s.buff = null; } }
      if (!w && wasW) { s.act = null; plan = null; }
      wasW = w;
    }
    if (!w) { if (onN() && G().playing && !G().uiOpen) { s.p = Math.min(100, s.p + 100 / 300 * (LP() ? LP().nemRate() : 1) * (window.Diff ? Diff.nem() : 1)); chipUI(true); } else chipUI(!!(onN() && G().playing)); inject(); return; }
    { const nb = document.getElementById('nemBuff'); if (nb) nb.remove(); } /* R57 */
    const boss = LP() && LP().isBossTrip(); chipUI(onN() && !boss);
    if (!plan || !onN() || boss) return; const now = performance.now() / 1000;
    if (w.busy || !w.B || w.B.corr) { plan.enteredAt = 0; return; } if (!plan.enteredAt) plan.enteredAt = now;
    if (LP() && G().playing && !w.dead) s.p = Math.min(100, s.p + 100 / 420 * LP().nemRate() * (window.Diff ? Diff.nem() : 1)); // R54i：出猎时逼近也在涨（满了就来），不只是洞里
    if (plan.first && now - plan.enteredAt > 6) { plan.first = false; strike('first').catch(() => { }); }
    else if (LP() && s.p >= 100 && now - plan.enteredAt > 8) { s.p = 0; strike('meter').then(ok => { if (!ok) s.p = 90; }).catch(() => { }); }
    else if (!LP() && now > plan.next && now - plan.enteredAt > 10) { plan.next = now + 240 + Math.random() * 180; strike('periodic').catch(() => { }); }
  }
  setInterval(() => { try { tick(); } catch (e) { } }, 1000);
  // R54l：遇到宿敌就封门——只有三种情况能离开：宿敌倒下、宿敌残血撤退、封锁时间到（SEAL_T 秒后你可以撤退）
  const SEAL_T = 90, isNem = f => f && (f.hunter2 || f.nemClone || f.nemX);
  function sealFoes() {
    const w = W(); if (!w || !window.Foe || !Foe.foes || !onN()) return []; const now = performance.now(), H2 = window.Hunters2, out = [];
    for (const f of Foe.foes) { if (!isNem(f) || f.dead || f.escaped) continue; if (!f._sealAt) f._sealAt = now;
      const fled = f._fled || (f.hunter2 && H2 && H2.T && H2.T.fo === f && H2.T.fleeAt); if (!fled && now - f._sealAt < SEAL_T * 1000) out.push(f); }
    return out;
  }
  const sealed = () => sealFoes().length > 0;
  const sealLeft = f => Math.max(0, Math.ceil(SEAL_T - (performance.now() - ((f && f._sealAt) || performance.now())) / 1000));
  function vanishFoe(fo) { fo.dead = true; fo.escaped = true; fo.rag = null; if (fo.warn) fo.warn.visible = false; try { if (fo.f && fo.f.root && fo.f.root.parent) fo.f.root.parent.remove(fo.f.root); Foe.say(fo, ''); } catch (e) { } const w = W(); if (w && w.foes) { const i = w.foes.indexOf(fo); if (i >= 0) w.foes.splice(i, 1); } const j = Foe.foes.indexOf(fo); if (j >= 0) Foe.foes.splice(j, 1); }
  let sealEl = null;
  function sealTick() {
    const w = W(), list = w && !w.busy ? sealFoes() : [], now = performance.now();
    if (w && window.Foe && Foe.foes) for (const f of Foe.foes.slice()) { if (!(f.nemClone || f.nemX) || f.dead) continue;
      if (!f._fled && f.hp <= f.maxHp * 0.25) { f._fled = now; f.state = 'flee'; f.brave = false; f.atk = null; f.spdMul = (f.spdMul || 1) * 1.3; try { G().toast(`💨 ${(f.h && f.h.c && f.h.c.name) || '宿敌'} 残血撤退了——门的封锁解除。8 秒内追上她还能斩下首级`, '#ffd070', 3); } catch (e) { } }
      if (f._fled) { f.state = 'flee'; if (now - f._fled > 8000) { if (f.nemX) { const x = (S().extra || []).find(e => e.n === f.nemIdx); if (x) x.lv++; } vanishFoe(f); try { G().toast('她带着伤逃走了——下次会更强。', '#c8c8c8', 2.4); } catch (e) { } } } }
    if (!sealEl) { sealEl = document.createElement('div'); sealEl.style.cssText = 'position:fixed;left:50%;top:132px;transform:translateX(-50%);z-index:34;pointer-events:none;padding:4px 14px;font:700 14px "Microsoft YaHei UI",sans-serif;color:#ffd8c8;text-shadow:0 1px 4px #000;background:linear-gradient(90deg,transparent,#2a0808d0 20%,#2a0808d0 80%,transparent);display:none'; document.body.appendChild(sealEl); }
    if (!list.length) { sealEl.style.display = 'none'; return; }
    const left = Math.max(...list.map(sealLeft)); sealEl.style.display = 'block'; sealEl.textContent = `🔒 宿敌在场，门被封死 · 打倒她 / 打到她残血撤退 / ${left} 秒后你可以撤退`;
  }
  setInterval(() => { try { sealTick(); } catch (e) { } }, 250);
  return { dmgK, hpK, spdK, heads, strike, S, addFoe, sealed, sealFoes, sealLeft, SEAL_T, dossierHTML };
})();
