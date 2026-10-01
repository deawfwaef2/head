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
  // ================= 合成女声（MOD fem_vox）：共振峰合成的喝声/痛呼/惨叫/笑声，替代 AI 语音 =================
  const VOW = { a: [850, 1610, 2850], e: [560, 2200, 2950], i: [380, 2600, 3300], o: [560, 960, 2600], u: [400, 880, 2500] };
  const SHAPE = { kiai: { d: 0.24, v: ['a', 'a'], p: [1.15, 1.4, 0.95], br: 0.5 }, hurt: { d: 0.32, v: ['a', 'o'], p: [1.45, 1.25, 0.95], br: 0.35 }, die: { d: 1.0, v: ['a', 'o'], p: [1.35, 1.2, 0.62], br: 0.3, vib: 7 }, eff: { d: 0.15, v: ['u', 'u'], p: [1.05, 1.1, 0.95], br: 0.25 }, laugh: { d: 0.09, v: ['e', 'e'], p: [1.3, 1.35, 1.2], br: 0.6, rep: 3 } };
  let voxN = 0, voxT = 0;
  function voxOne(c, o, t, f0, S) {
    const d = S.d, src = c.createOscillator(), s2 = c.createOscillator(); src.type = 'sawtooth'; s2.type = 'triangle';
    [src, s2].forEach((s, k) => { s.frequency.setValueAtTime(f0 * S.p[0] * (k ? 1.005 : 1), t); s.frequency.linearRampToValueAtTime(f0 * S.p[1] * (k ? 1.005 : 1), t + d * 0.3); s.frequency.exponentialRampToValueAtTime(f0 * S.p[2] * (k ? 1.005 : 1), t + d); });
    if (S.vib) { const lf = c.createOscillator(), lg = c.createGain(); lf.frequency.value = S.vib; lg.gain.value = f0 * 0.03; lf.connect(lg); lg.connect(src.frequency); lf.start(t); lf.stop(t + d + 0.05); }
    const mix = c.createGain(); mix.gain.value = 0.6; src.connect(mix); const m2 = c.createGain(); m2.gain.value = 0.4; s2.connect(m2); m2.connect(mix);
    const env = c.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(1, t + 0.018); env.gain.setValueAtTime(1, t + d * 0.55); env.gain.exponentialRampToValueAtTime(0.0001, t + d); env.connect(o);
    const v0 = VOW[S.v[0]], v1 = VOW[S.v[1]];
    [1, 0.45, 0.22].forEach((gk, i) => { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6 + i * 3; bp.frequency.setValueAtTime(v0[i] * 1.12, t); bp.frequency.linearRampToValueAtTime(v1[i] * 1.12, t + d); const g = c.createGain(); g.gain.value = gk * 2.2; mix.connect(bp); bp.connect(g); g.connect(env); });
    const ns = c.createBufferSource(); ns.buffer = noise(c); const nb = c.createBiquadFilter(); nb.type = 'bandpass'; nb.frequency.value = 2400; nb.Q.value = 0.8; const ng = c.createGain(); ng.gain.setValueAtTime(S.br * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(d, 0.12)); ns.connect(nb); nb.connect(ng); ng.connect(env);
    src.start(t); s2.start(t); ns.start(t); src.stop(t + d + 0.03); s2.stop(t + d + 0.03); ns.stop(t + d + 0.03);
  }
  function vox(fo, kind) {
    if (!M('fem_vox') || !fo || !fo.pos) return; const c = ac(); if (!c) return; const now = performance.now();
    if (kind !== 'die' && (fo._vx || 0) > now) return; fo._vx = now + 500; if (now - voxT > 300) { voxT = now; voxN = 0; } if (++voxN > 3) return;
    let dist = 6, pan = 0; try { const P = Foe.ctx().player.pos, dx = fo.pos.x - P.x, dz = fo.pos.z - P.z; dist = Math.hypot(dx, dz); const yaw = G.player.yaw; pan = Math.max(-0.8, Math.min(0.8, Math.sin(Math.atan2(-dx, -dz) - yaw) * -0.8)); } catch (e) { }
    if (dist > 24) return; const S = SHAPE[kind] || SHAPE.kiai, f0 = 250 + ((fo.id | 0) * 37 % 9) * 14 + (fo.boss ? -30 : 0);
    const g = c.createGain(); g.gain.value = Math.min(1, 1.6 / (1 + dist * 0.18)) * 0.42; let o = g; if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); o = p; } o.connect(out(c, 'voice'));
    const t = c.currentTime + 0.01; for (let i = 0; i < (S.rep || 1); i++) voxOne(c, g, t + i * (S.d + 0.06), f0 * (1 + i * 0.03), S);
  }

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const L_TAUNT = ['就这点本事？', '站稳了吗？', '嘻嘻，疼吗？', '别躲呀～', '你的头归我了！', '下一刀砍你脖子！', '慢死了！'];
  const L_HURT = ['呃啊——！', '好痛……', '可恶！', '你敢——！', '还没完！', '唔……'];
  const L_ALLY = ['姐妹——！', '不……不要！', '你会付出代价的！', '快、快围住他！', '别慌，一起上！', '他是怪物……'];
  const L_CHAT = ['包抄他！', '从后面上！', '别让他喘气！', '盯住他的刀！', '我数到三一起上！', '他累了，压上去！', '小心，他刀很快！', '左边！绕过去！'];
  let chatT = 0;
  window.Barks = {
    windup(fo, clip, A) {
      if (!A || !near(fo, 14)) return; const h = A.hits && A.hits[0]; let t, col = '#ffd27a';
      if (A.ranged || fo.role === 'ranged') t = '⚠ 抬手——要掷刃了！举刀挡';
      else if (/Combo/.test(clip)) { t = '⚠ 连斩起手——别贪刀，先退'; col = '#ff9a6a'; }
      else if (/Dash/.test(clip)) { t = '⚠ 压低身子——冲过来了！'; col = '#ff9a6a'; }
      else if (h && h.heavy) { t = '⚠ 高举重刃——要劈下来了！Q 闪'; col = '#ff6a5a'; }
      else if (h && h.thrust) t = '⚠ 收肘蓄力——突刺！侧闪';
      else if (h) { const d = dirTxt(h.ang != null ? h.ang : h.a); t = `⚔ ${d[1]} → ${d[2]}`; }
      if (t) bark(fo, t, col, 900); if (Math.random() < 0.7) vox(fo, 'kiai');
    },
    act(fo, k) { if (k === 'block' && near(fo, 8)) { bark(fo, '🛡 举刀护住这一侧——换个方向砍', '#9fd0ff'); vox(fo, 'eff'); } },
    landed(fo) { if (Math.random() < 0.5) { fo._bk = 0; bark(fo, pick(L_TAUNT), '#ffc0c0', 1800); vox(fo, 'laugh'); } }
  };
  function barkTick() {
    if (!window.Worlds || !Worlds.active || !window.Foe || !Foe.foes) return; const now = performance.now(); let engaged = null;
    for (const fo of Foe.foes) {
      if (!fo || !fo.pos) continue;
      if (fo._hpL == null) fo._hpL = fo.hp;
      if (fo.dead) { if (!fo._dv) { fo._dv = 1; vox(fo, 'die'); const al = Foe.foes.filter(o => o && !o.dead && o.pos && o.seen && Math.hypot(o.pos.x - fo.pos.x, o.pos.z - fo.pos.z) < 14); if (al.length && Math.random() < 0.7) { const w = pick(al); w._bk = 0; bark(w, pick(L_ALLY), '#ffd0c0', 1800); } } continue; }
      if (fo.hp < fo._hpL - 0.5) { vox(fo, 'hurt'); if (Math.random() < 0.3 && near(fo, 12)) bark(fo, pick(L_HURT), '#ffb8a8', 1600); } fo._hpL = fo.hp;
      if (!M('foe_barks') || !near(fo, 16)) continue;
      if (fo.state === 'flee' && !fo._bkF) { fo._bkF = 1; bark(fo, '⇠ 转身逃跑了！追上去', '#a8e0a0'); }
      else if (fo.maxHp && fo.hp > 0 && fo.hp < fo.maxHp * 0.3 && !fo._bkL) { fo._bkL = 1; bark(fo, '踉跄着……快撑不住了（可斩首）', '#ffb0b0'); }
      else if (fo.seen && !fo._bkS && fo.state === 'chase') { fo._bkS = 1; if (fo.role === 'assassin') bark(fo, '👁 她消失在你视野外——小心背后', '#c890ff'); else if (Math.random() < 0.5) bark(fo, '👁 发现你了——拔刀逼近', '#ffe0b0'); }
      if (fo.seen && fo.state === 'chase' && !fo.atk && near(fo, 12)) engaged = engaged || [], engaged.push(fo);
    }
    if (M('foe_barks') && engaged && engaged.length >= 2 && now > chatT) { chatT = now + 4000 + Math.random() * 3000; bark(pick(engaged), pick(L_CHAT), '#f0e0c0', 2000); }
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

  // ================= 可破坏的小物件（MOD breakables）：走近就碎，掉不占格子的碎料，攒够自动合成材料进储物箱 =================
  const SHD = { iron: ['铁屑', '🔩', 5], cloth: ['碎布', '🧵', 5], herb: ['草籽', '🌿', 5], dust: ['魂屑', '✨', 4], bone: ['骨渣', '🦴', 6], wood: ['木屑', '🪵', 6], meat: ['碎肉', '🥩', 5] };
  const BK = { pot: { n: '陶罐', y: [['cloth', 1, 2], ['herb', 1, 2]], snd: 'clay' }, crate: { n: '小木箱', y: [['wood', 1, 3], ['iron', 0, 2]], snd: 'wood' }, bones: { n: '枯骨堆', y: [['bone', 1, 3], ['dust', 0, 1]], snd: 'bone' }, crystal: { n: '魂晶簇', y: [['dust', 1, 3]], snd: 'glass' }, shroom: { n: '毒蘑菇', y: [['herb', 1, 3]], snd: 'soft' }, urn: { n: '骨灰瓮', y: [['dust', 1, 2], ['iron', 0, 1]], snd: 'clay' }, sack: { n: '破布袋', y: [['cloth', 1, 3], ['meat', 0, 2]], snd: 'soft' } };
  const BKK = Object.keys(BK); let bkGeo = null, bkMat = null, bkB = null; const BKS = [], DEB = [];
  function bkInit() {
    if (bkGeo) return; const T = THREE, lp = pts => new T.LatheGeometry(pts.map(([x, y]) => new T.Vector2(x, y)), 12);
    bkGeo = { pot: lp([[0, 0], [0.13, 0.01], [0.19, 0.12], [0.17, 0.26], [0.09, 0.33], [0.1, 0.38], [0.11, 0.4]]), urn: lp([[0, 0], [0.1, 0.01], [0.16, 0.16], [0.15, 0.36], [0.08, 0.46], [0.1, 0.5]]), crate: new T.BoxGeometry(0.42, 0.36, 0.42), bone: new T.CylinderGeometry(0.025, 0.03, 0.42, 6), skull: new T.SphereGeometry(0.09, 10, 8), crystal: new T.OctahedronGeometry(0.13, 0), stem: new T.CylinderGeometry(0.03, 0.04, 0.16, 6), cap: new T.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), sack: new T.SphereGeometry(0.2, 10, 8), deb: new T.TetrahedronGeometry(0.05, 0) };
    const S = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0 }, o || {}));
    bkMat = { clay: S('#8a5536'), dark: S('#4c4650'), wood: S('#6b4a2a'), bone: S('#d9cfb6'), crystal: S('#8fb4ff', { emissive: '#3a5ab8', emissiveIntensity: 0.55, roughness: 0.25 }), stem: S('#e8dcc8'), cap: S('#b8322a'), cloth: S('#7a6a50') };
  }
  function bkMesh(k) {
    const T = THREE, g = new T.Group(), m = (geo, mat, x, y, z, rx, rz, s) => { const o = new T.Mesh(bkGeo[geo], bkMat[mat]); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, 0, rz || 0); if (s) o.scale.setScalar(s); o.castShadow = true; g.add(o); return o; };
    if (k === 'pot') m('pot', 'clay'); else if (k === 'urn') m('urn', 'dark');
    else if (k === 'crate') m('crate', 'wood', 0, 0.18, 0);
    else if (k === 'bones') { m('skull', 'bone', 0, 0.08, 0); m('bone', 'bone', 0.12, 0.03, 0.05, Math.PI / 2, 0.6); m('bone', 'bone', -0.1, 0.03, -0.06, Math.PI / 2, -0.9); }
    else if (k === 'crystal') { m('crystal', 'crystal', 0, 0.22, 0, 0, 0.1).scale.set(1, 2.2, 1); m('crystal', 'crystal', 0.12, 0.12, 0.05, 0, -0.5).scale.set(0.7, 1.5, 0.7); m('crystal', 'crystal', -0.1, 0.1, -0.06, 0, 0.6).scale.set(0.6, 1.3, 0.6); }
    else if (k === 'shroom') { for (const [x, z, s] of [[0, 0, 1], [0.13, 0.06, 0.7], [-0.1, 0.08, 0.6]]) { m('stem', 'stem', x, 0.08 * s, z, 0, 0, s); m('cap', 'cap', x, 0.15 * s, z, 0, 0, s); } }
    else if (k === 'sack') m('sack', 'cloth', 0, 0.15, 0).scale.set(1, 0.75, 1);
    return g;
  }
  function bkSpawn(W) {
    const B = W.B, nd = W.graph && W.graph.nodes[W.cur]; if (!B || !B.sc || !B.H || !nd || nd.eliteArena || nd.huntArena) return; bkInit(); BKS.length = 0;
    let seed = ((nd.seed || 7) ^ 0x2545f491) >>> 0; const rr = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const R = Math.max(8, (B.R || 20) - 2), n = 14 + Math.floor(rr() * 9), cols = B.cols || [];
    for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
      const a = rr() * 6.283, r = 3 + Math.sqrt(rr()) * (R - 3), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (B.Rf && Math.hypot(x, z) > B.Rf(Math.atan2(z, x)) - 1.5) continue; if (cols.some(c => Math.hypot(x - c.x, z - c.z) < c.r + 0.7)) continue; if (BKS.some(b => Math.hypot(b.x - x, b.z - z) < 1.6)) continue;
      const k = BKK[Math.floor(rr() * BKK.length)], g = bkMesh(k); g.position.set(x, B.H(x, z), z); g.rotation.y = rr() * 6.28; B.sc.add(g); BKS.push({ k, g, x, z }); i++;
    }
  }
  function bkSnd(kind) {
    const c = M('move_sfx') && ac(); if (!c) return; const t = c.currentTime + 0.005, o = out(c, 'sfx');
    if (kind === 'glass') { [1760, 2640, 3520].forEach((f, i) => { const s = c.createOscillator(), g = c.createGain(); s.type = 'sine'; s.frequency.value = f * (0.98 + Math.random() * 0.04); g.gain.setValueAtTime(0.0001, t + i * 0.03); g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.03 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.03 + 0.6); s.connect(g); g.connect(o); s.start(t + i * 0.03); s.stop(t + 0.8); }); swoosh(c, o, t, 0.12, 0.3, 5000, 3000, 2); return; }
    const F = { clay: [2600, 900, 0.55], wood: [1400, 500, 0.6], bone: [3200, 1500, 0.4], soft: [700, 250, 0.35] }[kind] || [2000, 800, 0.5];
    swoosh(c, o, t, 0.16, F[2], F[0], F[1], 1.6); swoosh(c, o, t + 0.04, 0.22, F[2] * 0.5, F[0] * 0.7, F[1] * 0.6, 2.2); if (kind !== 'soft') thump(c, o, t, 0.25);
  }
  let feed = null;
  function feedMsg(html) {
    if (!feed) { const s = document.createElement('style'); s.textContent = '#bkFeed{position:fixed;right:18px;top:42%;z-index:40;pointer-events:none;display:flex;flex-direction:column;align-items:flex-end;gap:4px;font:600 14px "Microsoft YaHei UI",sans-serif}#bkFeed div{padding:4px 12px;background:linear-gradient(90deg,transparent,rgba(16,10,8,.85) 25%);color:#f0e2c8;text-shadow:0 1px 2px #000;animation:bkF 2.6s forwards}#bkFeed div b{color:#ffd27a}@keyframes bkF{0%{opacity:0;transform:translateX(20px)}10%{opacity:1;transform:none}75%{opacity:1}100%{opacity:0}}body.menuon #bkFeed{visibility:hidden}'; document.head.appendChild(s); feed = document.createElement('div'); feed.id = 'bkFeed'; document.body.appendChild(feed); }
    const d = document.createElement('div'); d.innerHTML = html; feed.appendChild(d); while (feed.children.length > 5) feed.firstChild.remove(); setTimeout(() => d.remove(), 2700);
  }
  function bkBreak(b) {
    b.dead = 1; const g = b.g, p = g.position.clone(); g.parent && g.parent.remove(g); bkSnd(BK[b.k].snd);
    const sc = Worlds._W && Worlds._W.B && Worlds._W.B.sc, mat = g.children[0] && g.children[0].material; if (sc && mat) for (let i = 0; i < 7; i++) { const o = new THREE.Mesh(bkGeo.deb, mat); o.position.set(p.x, p.y + 0.2, p.z); sc.add(o); DEB.push({ o, v: new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 3), t: 0, y0: p.y, sc }); }
    const S = G.S; S.shards = S.shards || {}; const got = [];
    for (const [id, a, z] of BK[b.k].y) { const n = a + Math.floor(Math.random() * (z - a + 1)); if (n <= 0) continue; S.shards[id] = (S.shards[id] || 0) + n; got.push(`${SHD[id][1]}${SHD[id][0]} <b>+${n}</b> <small>(${S.shards[id] % SHD[id][2]}/${SHD[id][2]})</small>`);
      const k = Math.floor(S.shards[id] / SHD[id][2]); if (k > 0 && window.Sack && Sack.stashAdd && Sack.mk && Sack.IT[id]) { S.shards[id] -= k * SHD[id][2]; try { Sack.stashAdd(Sack.mk(id, k)); setTimeout(() => feedMsg(`📦 攒够了 → ${Sack.IT[id].icon}${Sack.IT[id].n} <b>×${k}</b> 已送进储物箱`), 350); } catch (e) { } } }
    if (got.length) feedMsg(`💥 ${BK[b.k].n}：${got.join(' · ')}`);
  }
  let bkLast = 0;
  function bkFrame() {
    const now = performance.now(), dt = Math.min(0.05, (now - (bkLast || now)) / 1000); bkLast = now;
    for (let i = DEB.length - 1; i >= 0; i--) { const d = DEB[i]; d.t += dt; d.v.y -= 9 * dt; d.o.position.addScaledVector(d.v, dt); d.o.rotation.x += dt * 9; d.o.rotation.z += dt * 7; if (d.o.position.y < d.y0) { d.o.position.y = d.y0; d.v.multiplyScalar(0.3); } if (d.t > 1.4) { d.o.parent && d.o.parent.remove(d.o); DEB.splice(i, 1); } }
    if (DEB.length) requestAnimationFrame(bkFrame); else bkLast = 0;
  }
  function bkTick() {
    if (!M('breakables') || !window.Worlds || !Worlds.active || !window.THREE || !window.G || !G.S) return; const W = Worlds._W; if (!W || !W.B || W.busy || W.B.corr) return;
    if (W.B !== bkB) { bkB = W.B; try { bkSpawn(W); } catch (e) { console.warn('breakables', e); } }
    for (const b of BKS) if (!b.dead && Math.hypot(W.pos.x - b.x, W.pos.z - b.z) < 1.25) { bkBreak(b); if (DEB.length && !bkLast) requestAnimationFrame(bkFrame); }
  }

  window.R54n = { BKS, vox };
  setInterval(() => { try { bkTick(); } catch (e) { } }, 100);
  setInterval(() => { try { tidyTick(); } catch (e) { } try { intelTick(); } catch (e) { } try { barkTick(); } catch (e) { } }, 250);
})();
