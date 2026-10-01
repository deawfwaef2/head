// R54n：战斗可读性 + 界面整理
// Feel54n（MOD move_sfx）：跳跃/落地/闪身的程序合成音效
// Barks（MOD foe_barks）：敌人头顶气泡写出她正在干什么（起手方向、重击、突刺、格挡、逃跑）
// Intel（MOD region_intel）：进入有敌人的地点时弹出「敌情研判」：模糊等级、你的等级、胜率、推荐战术
// HudTidy（MOD hud_tidy）：任务/支线/月痕/异变统一排在左侧一列；猎手感应并进宿敌条；打开菜单时隐藏 HUD
(() => {
  const M = id => !window.Mods || Mods.on(id) !== false;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ================= 移动音效 =================
  let nzBuf = null;
  function ac() { const c = window.SFX && SFX.ctx; return c && c.state === 'running' && SFX.on !== false ? c : null; }
  function out(c, bus) { return (SFX.bus && SFX.bus(bus)) || SFX.out || c.destination; }
  function noise(c) { if (nzBuf) return nzBuf; const n = c.sampleRate * 0.6, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return nzBuf = b; }
  function swoosh(c, o, t, dur, vol, f0, f1, q) {
    const s = c.createBufferSource(); s.buffer = noise(c); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q || 1.2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(o); s.start(t); s.stop(t + dur + 0.02);
  }
  function thump(c, o, t, vol) { const s = c.createOscillator(); s.type = 'sine'; s.frequency.setValueAtTime(110, t); s.frequency.exponentialRampToValueAtTime(42, t + 0.16); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); s.connect(g); g.connect(o); s.start(t); s.stop(t + 0.22); }
  window.Feel54n = {
    jump() { const c = M('move_sfx') && ac(); if (!c) return; const t = c.currentTime + 0.005; swoosh(c, out(c, 'steps'), t, 0.2, 0.32, 700, 300, 0.9); },
    land(v) { const c = M('move_sfx') && ac(); if (!c) return; const t = c.currentTime + 0.005, o = out(c, 'steps'), k = Math.min(1, (v || 4) / 9); thump(c, o, t, 0.35 + 0.5 * k); swoosh(c, o, t, 0.14, 0.25 + 0.3 * k, 420, 160, 0.8); },
    dash() { const c = M('move_sfx') && ac(); if (!c) return; const t = c.currentTime + 0.005; swoosh(c, out(c, 'sfx'), t, 0.28, 0.55, 2200, 380, 1.4); swoosh(c, out(c, 'steps'), t + 0.02, 0.18, 0.3, 600, 200, 0.8); }
  };

  // ================= 敌人动作气泡 =================
  const DIRS = [[0, '从右侧横斩', '往左闪'], [45, '从右上斜劈', '往左下闪'], [90, '高举过头竖劈', '侧闪'], [135, '从左上斜劈', '往右闪'], [180, '从左侧横斩', '往右闪'], [-135, '自左下撩起', '往右闪'], [-90, '自下向上挑', '后撤'], [-45, '自右下撩起', '往左闪']];
  function dirTxt(a) { const deg = a * 180 / Math.PI; let best = DIRS[0], bd = 999; for (const d of DIRS) { let x = Math.abs(((deg - d[0]) % 360 + 540) % 360 - 180); if (x < bd) { bd = x; best = d; } } return best; }
  function near(fo, r) { try { const P = Foe.ctx().player.pos; return Math.hypot(fo.pos.x - P.x, fo.pos.z - P.z) < r; } catch (e) { return false; } }
  function bark(fo, text, col, cd) { if (!M('foe_barks') || !fo || fo.dead || !window.Foe) return; const now = performance.now(); if ((fo._bk || 0) > now) return; fo._bk = now + (cd || 1400) ; const st = fo.sayT; Foe.say(fo, text, col); fo.sayT = st; }
  window.Barks = {
    windup(fo, clip, A) {
      if (!A || !near(fo, 14)) return; const h = A.hits && A.hits[0]; let t, col = '#ffd27a';
      if (A.ranged || fo.role === 'ranged') t = '⚠ 抬手——要掷刃了！举刀挡';
      else if (/Combo/.test(clip)) { t = '⚠ 连斩起手——别贪刀，先退'; col = '#ff9a6a'; }
      else if (/Dash/.test(clip)) { t = '⚠ 压低身子——冲过来了！'; col = '#ff9a6a'; }
      else if (h && h.heavy) { t = '⚠ 高举重刃——要劈下来了！Q 闪'; col = '#ff6a5a'; }
      else if (h && h.thrust) t = '⚠ 收肘蓄力——突刺！侧闪';
      else if (h) { const d = dirTxt(h.ang != null ? h.ang : h.a); t = `⚔ ${d[1]} → ${d[2]}`; }
      if (t) bark(fo, t, col, 900);
    },
    act(fo, k) { if (k === 'block' && near(fo, 8)) bark(fo, '🛡 举刀护住这一侧——换个方向砍', '#9fd0ff'); }
  };
  function barkTick() {
    if (!M('foe_barks') || !window.Worlds || !Worlds.active || !window.Foe || !Foe.foes) return;
    for (const fo of Foe.foes) {
      if (!fo || fo.dead || !fo.pos || !near(fo, 16)) continue;
      if (fo.state === 'flee' && !fo._bkF) { fo._bkF = 1; bark(fo, '⇠ 转身逃跑了！追上去', '#a8e0a0'); }
      else if (fo.maxHp && fo.hp > 0 && fo.hp < fo.maxHp * 0.3 && !fo._bkL) { fo._bkL = 1; bark(fo, '踉跄着……快撑不住了（可斩首）', '#ffb0b0'); }
      else if (fo.seen && !fo._bkS && fo.state === 'chase') { fo._bkS = 1; if (fo.role === 'assassin') bark(fo, '👁 她消失在你视野外——小心背后', '#c890ff'); else if (Math.random() < 0.5) bark(fo, '👁 发现你了——拔刀逼近', '#ffe0b0'); }
    }
  }

  // ================= 敌情研判 =================
  const ROLE_TIP = { brute: '🪓 蛮兵：轻击打不断——等她重击前摇时 Q 闪身，再蓄力重斩', skirm: '💨 游击：别乱挥，等她冲刺落地再砍', guard: '🛡️ 盾卫：绕侧面换方向砍，或蓄力重斩破防', assassin: '🗡️ 刺客：会绕到背后——听到拔刀声立刻 Q', berserk: '🔥 狂战：半血后狂暴——先集火她', ranged: '🎯 投掷手：先冲过去解决远程，刃飞来时举刀挡' };
  const MULT = [0.7, 0.9, 1.15, 1.5, 2.1];
  let icEl = null, icT = 0, icWait = 0;
  function intelCss() {
    if (document.getElementById('icCss')) return; const s = document.createElement('style'); s.id = 'icCss'; s.textContent = `
#icCard{position:fixed;left:50%;top:15vh;transform:translate(-50%,-12px);width:min(520px,90vw);z-index:60;pointer-events:none;opacity:0;transition:opacity .35s,transform .35s;font-family:"Noto Serif SC","Songti SC",serif;color:#efe4d2;
 background:linear-gradient(180deg,rgba(26,14,14,.94),rgba(10,6,8,.92));border:1px solid #6a4a2a;box-shadow:0 18px 50px #000b,inset 0 1px 0 #ffffff14;padding:16px 22px 14px}
#icCard.on{opacity:1;transform:translate(-50%,0)}
#icCard .k{font:700 12px/1 sans-serif;letter-spacing:.5em;color:#c9a46a}#icCard h3{margin:6px 0 10px;font-size:24px;letter-spacing:.12em;color:#fff3dc}
#icCard .g{display:grid;grid-template-columns:1fr 1fr 1.1fr;gap:10px;margin-bottom:10px}#icCard .g>div{background:#0007;border:1px solid #ffffff14;padding:8px 10px}
#icCard .g small{display:block;font:600 11.5px sans-serif;color:#a8977c;letter-spacing:.15em}#icCard .g b{display:block;font-size:20px;margin-top:3px}
#icCard .m{height:6px;background:#0009;margin-top:5px}#icCard .m i{display:block;height:100%}
#icCard ul{margin:0;padding:0;list-style:none;font:500 14.5px/1.65 "Microsoft YaHei UI",sans-serif}#icCard li{padding-left:2px}#icCard .f{margin-top:8px;font:500 11.5px sans-serif;color:#8a7a68;text-align:right}`; document.head.appendChild(s);
  }
  function myLv() { try { return RPG.lvOf(G.S.xp).lv; } catch (e) { return 1; } }
  function intelShow(W, node) {
    const fs = Foe.foes.filter(f => f && !f.dead && f.pos); if (!fs.length) return; intelCss();
    const st = G.st(), mp = Math.max(1, st.power || 1), base = (node.loc && node.loc.rec) || mp, L = myLv();
    const recs = fs.map(f => f.absRec || base * (MULT[f.rar | 0] || 1) * (f.boss ? 1.6 : 1));
    const lvs = recs.map(r => Math.max(1, Math.round(L * r / mp))), lo = Math.max(1, Math.min(...lvs) - 1), hi = Math.max(...lvs) + 1 + (Math.random() < 0.5 ? 1 : 0);
    const ps = recs.map(r => 1 / (1 + Math.exp(-4 * (mp / r - 1)))), pm = ps.reduce((a, b) => a + b, 0) / ps.length, p = Math.max(0.03, Math.min(0.97, Math.pow(pm, 1 + 0.3 * (fs.length - 1)))), pc = Math.round(p * 20) * 5;
    const col = p >= 0.6 ? '#9fe89f' : p >= 0.35 ? '#ffd060' : '#ff7a6a', boss = fs.find(f => f.boss), el = fs.filter(f => f.elite || (f.aff && f.aff.length)).length;
    const tips = []; if (boss) tips.push('👑 首领：看地面红圈预警，Q 闪开重击后连砍，残血可斩首');
    const roles = [...new Set(fs.map(f => f.role).filter(r => ROLE_TIP[r]))]; roles.slice(0, 2).forEach(r => tips.push(ROLE_TIP[r]));
    if (fs.length >= 4) tips.push('👥 敌众：退到门口窄处，一次只放一个人过来');
    if (p < 0.35) tips.push('⚠ 胜率很低：趁她们没发现你从背后蓄力斩首，或者直接走别的门');
    if (tips.length < 3) tips.push('🗡️ 未察觉的敌人：从背后蓄力一刀可直接斩首');
    if (tips.length < 3) tips.push('⚔ 看头顶气泡：写着她要从哪边砍、往哪边闪');
    if (!icEl) { icEl = document.createElement('div'); icEl.id = 'icCard'; document.body.appendChild(icEl); }
    icEl.innerHTML = `<div class="k">敌 情 研 判</div><h3>${esc(node.name || '')}</h3>
<div class="g"><div><small>敌人</small><b>${fs.length} 名${el ? ` <span style="font-size:13px;color:#ffb070">精英 ${el}</span>` : ''}${boss ? ' <span style="font-size:13px;color:#ff8070">首领</span>' : ''}</b><small style="margin-top:4px">约 Lv ${lo}~${hi}${boss ? ' / ??' : ''}</small></div>
<div><small>你</small><b>Lv ${L}</b><small style="margin-top:4px">战力 ${Math.round(mp)}</small></div>
<div><small>预估胜率</small><b style="color:${col}">约 ${pc}%</b><div class="m"><i style="width:${pc}%;background:${col}"></i></div></div></div>
<ul>${tips.slice(0, 3).map(t => `<li>${esc(t)}</li>`).join('')}</ul><div class="f">等级与胜率为模糊估计 · 出手即关闭</div>`;
    icEl.classList.add('on'); icT = performance.now() + 9000;
  }
  function intelHide() { if (icEl) icEl.classList.remove('on'); icT = 0; }
  addEventListener('mousedown', () => { if (icT && performance.now() > icT - 7500) intelHide(); }, true);
  function intelTick() {
    if (icT && performance.now() > icT) intelHide();
    if (!M('region_intel') || !window.Worlds || !Worlds.active || !window.Foe || !Foe.foes) { if (!(window.Worlds && Worlds.active)) intelHide(); return; }
    const W = Worlds._W; if (!W || !W.B || W.busy || W.B.corr || !W.graph) return; const node = W.graph.nodes[W.cur]; if (!node) return;
    if (node._ic) return;
    if ((window.Arrival2 && Arrival2.isOpen()) || (window.Saga && Saga.cine) || (window.GrandUI && GrandUI.isOpen()) || (window.DecapCam && DecapCam.active) || (window.G && G.uiOpen)) { icWait = 0; return; }
    if (!Foe.foes.some(f => f && !f.dead)) return; if ((icWait += 1) < 2) return; icWait = 0; node._ic = 1;
    try { intelShow(W, node); } catch (e) { console.warn('Intel', e); }
  }

  // ================= HUD 整理 =================
  const HT = () => M('hud_tidy');
  window.HudTidy = { on: HT };
  function tidyCss() {
    if (document.getElementById('htCss')) return; const s = document.createElement('style'); s.id = 'htCss'; s.textContent = `
body.htidy #h2Sense{display:none!important}
body.htidy #rqTrack,body.htidy #arTrack,body.htidy #mtTrack,body.htidy #sgTrack{left:14px!important;right:auto!important;width:300px!important;max-width:300px!important;box-sizing:border-box;transform:none!important;margin:0!important;
 background:linear-gradient(90deg,rgba(18,10,12,.86),rgba(18,10,12,.6))!important;border:0!important;border-left:3px solid #c9a46a!important;border-radius:0!important;box-shadow:0 4px 14px #0006!important;padding:8px 12px!important;font-size:13.5px!important;line-height:1.5!important;clip-path:none!important}
body.htidy #arTrack{border-left-color:#8fa8c8!important}body.htidy #mtTrack{border-left-color:#b8a0ff!important}body.htidy #sgTrack{border-left-color:#ff8a6a!important}
body.htidy #nemChip{top:6px!important;padding:5px 18px!important;font-size:13.5px!important}
body.menuon #wRoot,body.menuon #nemChip,body.menuon #h2Hud,body.menuon #tbBar,body.menuon #hpC,body.menuon #tbCol,body.menuon #rqHud,body.menuon #arTrack,body.menuon #mtTrack,body.menuon #sgTrack,body.menuon #tut,body.menuon #hubBtn,body.menuon #mmBox,body.menuon #combatHud,body.menuon #hitHud,body.menuon #icCard,body.menuon #atkCd,body.menuon #cross{visibility:hidden!important}`; document.head.appendChild(s);
  }
  function vis(e) { if (!e) return false; const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && e.offsetHeight > 4; }
  function tidyTick() {
    const on = HT(), b = document.body; if (!b) return; b.classList.toggle('htidy', on); const mn = document.getElementById('menu'); b.classList.toggle('menuon', !!(on && mn && !mn.classList.contains('hidden') && getComputedStyle(mn).display !== 'none'));
    if (!on) return; tidyCss();
    const tc = document.getElementById('tbCol'); let y = tc && vis(tc) ? Math.round(tc.getBoundingClientRect().bottom) + 10 : 110;
    for (const id of ['rqTrack', 'arTrack', 'mtTrack', 'sgTrack']) { const e = document.getElementById(id); if (!vis(e)) continue; e.style.setProperty('top', y + 'px', 'important'); e.style.setProperty('bottom', 'auto', 'important'); y += e.offsetHeight + 8; }
  }

  setInterval(() => { try { tidyTick(); } catch (e) { } try { intelTick(); } catch (e) { } try { barkTick(); } catch (e) { } }, 250);
})();
