// R56 SAN 值：洞穴挂机的“临时资源”（用户：“洞里左键点头没反馈了……结合下洞穴挂机？设计一种资源【SAN值】——点头还是有 SAN 值，SAN 值更像临时 BUFF 加成，给下一局的临时加成……
//   你所有建筑应该有的产出 SAN 值，有的产出魂晶，魂晶比较稀有、按回合，SAN 值刷得很快；SAN 的作用有很多——强化下一局？武器暂时性附魔？都是暂时性的效果。血契的 UI 位置不好，不应该塞在探索 UI 里”）。MOD `san`（默认开，依赖 run_loop + round_yield）。
// ① 洞里左键把玩 / 建筑计时 / 魂轮 → 产 SAN（trigger() 在 game.js 里转给 San.gain）；② 建筑分两类：低倍率（mount.mult < 2）= SAN 型（洞里持续挂机），
//    高倍率 / 祭仪厅 = 魂晶型（只在回合结算时发，稀有）；③ SAN 祭坛（Tab 菜单 / ` 键）花 SAN 买：下一趟增益（并入 Loop.nb）、武器临时附魔（worlds.js 事件 → San.event）、躁动、额外祝福抉择、魂晶香；
// ④ 所有 SAN 效果只管“下一趟”：出发时 arm → act，回洞即消散；离洞期间首级仍挂机（按挂机速度 ×50% 折算 SAN）；⑤ 肉鸽「流派 / 祝福」面板搬出探索 UI，放进 Tab 菜单「🎴 流派 · 祝福」页。
window.San = (() => {
  'use strict';
  const on = () => !window.Mods || !Mods.on || Mods.on('san') !== false;
  const G0 = () => window.G, wild = () => !!(window.Worlds && Worlds.active);
  const rOn = () => !!(window.Loop && Loop.rOn && Loop.rOn());
  const live = () => on() && rOn() && !wild(); // 洞里且回合制：SAN 才会产出
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const now = () => performance.now() / 1000;
  // ---- 数值（调平衡改这里）----
  const K = 3;          // SAN = 旧版魂晶产出 × K
  const POKE = 1;       // 左键把玩的 SAN 系数（>1 更偏手动、<1 更偏挂机）
  const COIN_MULT = 2;  // 建筑 mount.mult ≥ 此值 → 魂晶型
  const AWAY = 0.5, AWAY_MAX = 600; // 离洞挂机折算：速度 ×50%，最多按 600 秒算
  const FRENZY_SEC = 120;
  const BUFFS = [
    { k: 'dmg', ic: '💢', n: '嗜血低语', per: 0.12, c: 150, d: n => `伤害 +${Math.round(n * 12)}%` },
    { k: 'hp', ic: '🛡️', n: '铁肤', per: 0.15, c: 150, d: n => `生命 +${Math.round(n * 15)}%` },
    { k: 'spd', ic: '🏃', n: '疾行', per: 0.1, c: 120, d: n => `移速 +${Math.round(n * 10)}%` },
    { k: 'fear', ic: '😱', n: '恐惧光环', per: 0.06, c: 200, d: n => `敌人生命 -${Math.round(n * 6)}%` },
    { k: 'heal', ic: '🩸', n: '啜饮', per: 0.015, c: 200, d: n => `每杀回血 ${(n * 1.5).toFixed(1)}%` },
    { k: 'clear', ic: '🪙', n: '贪婪', per: 0.25, c: 160, d: n => `清空地点奖励 +${Math.round(n * 25)}%` }
  ], BMAX = 3;
  const ENCH = [
    { k: 'fire', ic: '🔥', n: '炽焰', d: '命中 30% 点燃目标（3 秒烧掉 40% 伤害）' },
    { k: 'frost', ic: '❄️', n: '霜寒', d: '命中冻伤目标 3 秒（减速、受击更重）' },
    { k: 'thunder', ic: '⚡', n: '雷鸣', d: '每 4 次命中放一道闪电，劈向附近 2 个敌人' },
    { k: 'venom', ic: '☠️', n: '剧毒', d: '每次命中叠毒（最多 4 层），4 秒内持续掉血' },
    { k: 'blood', ic: '🩸', n: '血饮', d: '每次命中回 1% 最大生命；击杀再回 3%' },
    { k: 'soul', ic: '👻', n: '噬魂', d: '每次击杀额外掉落魂晶（随章节增长）' }
  ];
  const ECOST = 300, FCOST = 400, XCOST = 600, BCOST = 900;
  const EBY = Object.fromEntries(ENCH.map(e => [e.k, e])), BBY = Object.fromEntries(BUFFS.map(b => [b.k, b]));

  // ---- 状态（存档里 S.san）----
  const blank = () => ({ v: 0, tot: 0, arm: { b: {}, e: '', ep: 0 }, act: { b: {}, e: '' }, fz: 0, log: 0, idle: 0, bb: 0, told: 0 });
  function st() { const g = G0(), S = g && g.S; if (!S) return blank(); const s = S.san || (S.san = blank()); if (!s.arm) s.arm = { b: {}, e: '', ep: 0 }; if (!s.act) s.act = { b: {}, e: '' }; return s; }
  const chapK = () => { try { return 1 + 0.15 * (Math.max(1, Loop.R().chap || 1) - 1); } catch (e) { return 1; } };
  const costOf = (b, own) => Math.round(b.c * chapK() * Math.pow(1.6, own));

  // ---- 建筑分类 ----
  function kind(type) {
    if (type === 'wheel') return 'san';
    const d = window.BuildCat && BuildCat.C[type]; if (!d || !d.mount) return 'none';
    if (window.Loop && Loop.ROUND && Loop.ROUND[type]) return 'coin';
    if (!d.mount.mult || d.mount.period > 1e6) return 'none';
    return d.mount.mult >= COIN_MULT ? 'coin' : 'san';
  }
  const badge = type => { const k = kind(type); return k === 'san' ? '<small style="margin-left:5px;font-size:10px;color:#8fe6ff;font-weight:400">🌀SAN</small>' : k === 'coin' ? '<small style="margin-left:5px;font-size:10px;color:#ffd27a;font-weight:400">🔮魂晶</small>' : ''; };

  // ---- 产出 ----
  const win = []; // [t, n, idle]
  function gain(val, h, src) {
    const s = st(), man = src === 'manual' || src === 'hold';
    const n = Math.max(1, Math.round(val * K * (man ? POKE : 1) * (s.fz > 0 ? 2 : 1)));
    s.v += n; s.tot += n; s.log += n; win.push([now(), n, man ? 0 : 1]);
    if (!s.told) { s.told = 1; try { G0().toast('🌀 SAN 值：洞里把玩首级、低阶建筑挂机都会产出。它是临时资源——Tab 菜单里的「SAN 祭坛」可以换下一趟的增益、武器附魔……魂晶只有高阶建筑 / 祭仪厅 / 出猎才有', '#8fe6ff', 6.5); } catch (e) { } }
    return n;
  }
  function idleRate() { const t = now(); while (win.length && t - win[0][0] > 24) win.shift(); let sum = 0, t0 = t; for (const w of win) if (w[2]) { sum += w[1]; t0 = Math.min(t0, w[0]); } return sum / Math.max(8, Math.min(24, t - t0)); }

  // ---- 增益 / 附魔 ----
  function nb() { const s = st(), o = {}; let any = 0; for (const src of [s.arm.b, s.act.b]) for (const k in src) { const b = BBY[k]; if (!b || !(src[k] > 0)) continue; o[k] = (o[k] || 0) + b.per * src[k]; any = 1; } return any ? o : null; }
  const enchOf = () => { const s = st(); return s.act.e || s.arm.e || ''; };
  const sumTxt = () => { const s = st(), p = []; const e = s.act.e || s.arm.e; if (e && EBY[e]) p.push(EBY[e].ic + EBY[e].n); for (const b of BUFFS) { const n = (s.arm.b[b.k] || 0) + (s.act.b[b.k] || 0); if (n) p.push(b.ic + '×' + n); } if (s.fz > 0) p.push('⚡躁动'); return p.join(' '); };

  // ---- 武器附魔（worlds.js foeEvent → San.event）----
  const alive = () => (window.Foe && Foe.foes ? Foe.foes.filter(f => !f.dead && f.pos) : []);
  const near = (fo, r, n) => alive().filter(f => f !== fo && Math.hypot(f.pos.x - fo.pos.x, f.pos.z - fo.pos.z) < r).sort((a, b) => Math.hypot(a.pos.x - fo.pos.x, a.pos.z - fo.pos.z) - Math.hypot(b.pos.x - fo.pos.x, b.pos.z - fo.pos.z)).slice(0, n);
  const fx = (fo, col) => { try { const p = fo.pos.clone(); p.y += 1.2; Foe.spark(p, 10, col); } catch (e) { } };
  const dot = (fo, n, col) => { if (!fo || fo.dead || !(n >= 1)) return; try { Foe.dot(fo, n, { proc: true }); if (col !== undefined) fx(fo, col); } catch (e) { } };
  function bleed(fo, total, ticks, secs, col) { const per = total / ticks; for (let i = 1; i <= ticks; i++) setTimeout(() => dot(fo, per, i === ticks ? col : undefined), i * 1000 * secs / ticks); }
  const heal = k => { try { const g = G0(), s = g.st(); g.S.hp = Math.min(s.maxHp, g.S.hp + s.maxHp * k); } catch (e) { } };
  let hits = 0, healT = 0;
  function event(t, fo, d) {
    const e = st().act.e; if (!e || !on() || !fo) return;
    if (t === 'hit') {
      const dealt = (d && d.dealt) || 0; if (!dealt || (d && d.proc)) return; hits++;
      if (e === 'fire') { if (Math.random() < 0.3) bleed(fo, dealt * 0.4, 3, 3, null); }
      else if (e === 'frost') { fo._chill = now() + 3; fo.cd = (fo.cd || 0) + 0.2; fx(fo, 'blue'); }
      else if (e === 'thunder') { if (hits % 4 === 0) for (const f of near(fo, 6, 2)) dot(f, dealt * 0.6, 'blue'); }
      else if (e === 'venom') { fo._sv = fo._sv || 0; if (fo._sv < 4) { fo._sv++; bleed(fo, dealt * 0.3, 4, 4, undefined); setTimeout(() => { fo._sv = Math.max(0, (fo._sv || 1) - 1); }, 4000); } }
      else if (e === 'blood') { const t0 = now(); if (t0 - healT > 0.4) { healT = t0; heal(0.01); } }
    } else if (t === 'kill') {
      if (e === 'blood') heal(0.03);
      else if (e === 'soul') { try { const c = Math.max(2, Math.round(3 * (1 + 0.2 * (Loop.R().chap || 1)))); G0().addCoins(c); const w = Worlds._W; if (w && w.trip) w.trip.coins += c; } catch (x) { } }
      else if (e === 'thunder') for (const f of near(fo, 6, 1)) dot(f, 20, 'blue');
    }
  }

  // ---- 购买 ----
  const tip = (t, c, s) => { try { G0().toast(t, c || '#8fe6ff', s || 2.6); } catch (e) { } };
  const sfx = n => { try { SFX[n] && SFX[n](); } catch (e) { } };
  function fail(why) { tip(why, '#ff9a8a', 1.8); sfx('click'); return false; }
  function buyBuff(k) { const b = BBY[k], s = st(), own = s.arm.b[k] || 0; if (!b) return false; if (own >= BMAX) return fail('已叠满（' + BMAX + ' 层）'); const c = costOf(b, own); if (s.v < c) return fail('SAN 不够'); s.v -= c; s.arm.b[k] = own + 1; tip(`${b.ic} ${b.n} ×${own + 1}：下一趟 ${b.d(own + 1)}`); sfx('coins'); return true; }
  function buyEnch(k) {
    const e = EBY[k], s = st(); if (!e) return false; if (s.arm.e === k) return fail('已经附上了'); const old = s.arm.e ? s.arm.ep : 0, c = Math.round(ECOST * chapK());
    if (s.v + old < c) return fail('SAN 不够'); s.v += old - c; s.arm.e = k; s.arm.ep = c; tip(`${e.ic} 武器附魔「${e.n}」：${e.d}（下一趟有效${old ? '，已换下原来的附魔并退还 SAN' : ''}）`); sfx('coins'); return true;
  }
  function buySpecial(k) {
    const s = st(), ck = chapK();
    if (k === 'frenzy') { const c = Math.round(FCOST * ck); if (s.fz > FRENZY_SEC / 2) return fail('躁动还在持续'); if (s.v < c) return fail('SAN 不够'); s.v -= c; s.fz = FRENZY_SEC; tip(`⚡ 躁动！${FRENZY_SEC} 秒内 SAN 产量 ×2`); sfx('fanfare'); return true; }
    if (k === 'incense') { const c = Math.round(XCOST * ck), r = Loop.R(); if ((r.inc || 0) >= 0.35) return fail('魂晶香已到上限（+35%）'); if (s.v < c) return fail('SAN 不够'); s.v -= c; r.inc = Math.min(0.35, (r.inc || 0) + 0.1); tip(`🕯️ 魂晶香：下一次回合结算魂晶 +${Math.round(r.inc * 100)}%`, '#ffd890'); sfx('coins'); return true; }
    if (k === 'boon') { if (!(window.Rogue && Rogue.on())) return fail('肉鸽 MOD 没开'); const c = Math.round(BCOST * ck * Math.pow(1.6, s.bb)); if (s.v < c) return fail('SAN 不够'); s.v -= c; s.bb++; Rogue.grant(1, '月光窥视'); sfx('fanfare'); return true; }
    return false;
  }
  const bcost = () => Math.round(BCOST * chapK() * Math.pow(1.6, st().bb));

  // ---- 出发 / 回洞 ----
  let prevWild = false, wildAt = 0, inited = false;
  function tick(dt) {
    const s = st(), w = wild();
    if (!inited) { inited = 1; prevWild = w; if (!w) { s.act = { b: {}, e: '' }; } }
    if (w && !prevWild) { // 出发
      s.act = { b: Object.assign({}, s.arm.b), e: s.arm.e }; s.arm = { b: {}, e: '', ep: 0 }; wildAt = now();
      const t = sumTxt(); if (t) tip('🌀 SAN 强化生效：' + t + '（这一趟有效，回洞后消散）', '#8fe6ff', 4);
    } else if (!w && prevWild) { // 回洞
      const had = Object.keys(s.act.b).length || s.act.e; s.act = { b: {}, e: '' };
      const secs = Math.min(AWAY_MAX, now() - wildAt), r = s.idle || 0;
      if (on() && rOn() && r > 0.2 && secs > 15) { const n = Math.round(r * secs * AWAY); if (n > 0) { s.v += n; s.tot += n; s.log += n; tip(`🌀 你不在的时候，洞里的首级还在挂机：SAN +${n}${had ? '（出门带的 SAN 强化已消散）' : ''}`, '#8fe6ff', 4.2); } }
      else if (had) tip('🌀 这一趟的 SAN 强化消散了', '#a8c8d8', 2.4);
    }
    prevWild = w;
    if (!w && s.fz > 0) s.fz = Math.max(0, s.fz - dt);
    const r = idleRate(); if (r > 0.05 && !w) s.idle = r;
  }
  function endTrip() { const s = st(), n = s.log; s.log = 0; s.bb = 0; return n > 0 ? `🌀 这一回合洞里累计产出 SAN +${n}（现有 ${s.v}）——去 SAN 祭坛换下一趟的强化` : ''; }

  // ---- HUD ----
  let hud = null, chip = null;
  function css() {
    if (document.getElementById('sanCss')) return; const el = document.createElement('style'); el.id = 'sanCss'; el.textContent = `
#hud .u-san{display:flex;flex-direction:column;align-items:flex-start;border-left:1px solid rgba(143,230,255,.35);padding-left:10px;min-width:60px}
#hud .u-san b{font:800 17px/1.1 "SF Mono",Consolas,monospace;color:#8fe6ff;text-shadow:0 0 8px rgba(80,200,255,.5)}#hud .u-san b.bump{animation:sanBump .25s}@keyframes sanBump{50%{transform:scale(1.18)}}
#hud .u-san .u-lbl{color:#7fb8cc!important;font-size:12px}#hud .u-san .fx{font-size:12px;color:#c8f0ff;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#sanChip{position:fixed;right:14px;bottom:88px;z-index:30;display:none;flex-direction:column;align-items:flex-end;gap:5px;pointer-events:none;font:700 13px "Microsoft YaHei UI",sans-serif}
#sanChip span{padding:4px 11px;border:1px solid #8a6ab8;background:rgba(18,10,26,.85);color:#e8d0ff;border-radius:3px;letter-spacing:.04em}#sanChip kbd{margin-left:6px;padding:0 5px;border:1px solid #8a6ab8;border-bottom-width:2px;border-radius:3px;font-size:11px;color:#ffd98a}
#sanPn{position:fixed;inset:0;z-index:110;display:none;justify-content:center;align-items:flex-start;padding:26px 20px;box-sizing:border-box;background:rgba(4,7,12,.9);overflow:auto;color:#dfe8f0;font:14px/1.6 "Microsoft YaHei UI","Noto Sans CJK SC",system-ui,sans-serif;user-select:none}
#sanPn.on{display:flex}body.hubon #sanPn{padding-left:calc(var(--hubW,196px) + 20px)}
#sanPn .box{width:min(1020px,100%)}#sanPn h2{margin:0 0 4px;font:800 24px "Noto Serif SC",serif;letter-spacing:.14em;color:#8fe6ff}#sanPn h3{margin:18px 0 8px;font:700 15px "Noto Serif SC",serif;letter-spacing:.1em;color:#d9eef8;border-bottom:1px solid rgba(143,230,255,.2);padding-bottom:4px}#sanPn h3 small{font:12px sans-serif;color:#8aa4b0;letter-spacing:0;margin-left:8px}
#sanPn .top{display:flex;flex-wrap:wrap;gap:6px 26px;align-items:baseline;padding:10px 14px;background:linear-gradient(90deg,rgba(40,90,110,.35),rgba(10,20,28,.4));border:1px solid rgba(143,230,255,.3);border-radius:4px}
#sanPn .top .n{font:800 34px "SF Mono",Consolas,monospace;color:#8fe6ff;text-shadow:0 0 12px rgba(80,200,255,.5)}#sanPn .top span{color:#a8c4d0;font-size:13px}#sanPn .top b{color:#e8f8ff}
#sanPn .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:9px}
#sanPn .cd{padding:10px 12px;border:1px solid rgba(143,230,255,.28);background:linear-gradient(#10202a,#0a1219);border-radius:4px;cursor:pointer;transition:transform .1s,border-color .1s}
#sanPn .cd:hover{transform:translateY(-1px);border-color:#8fe6ff}#sanPn .cd.poor{opacity:.5;cursor:not-allowed}#sanPn .cd.max{opacity:.6}#sanPn .cd.on{border-color:#ffd27a;background:linear-gradient(#2a2410,#14100a)}
#sanPn .cd b{display:block;font-size:15px;color:#e8f8ff}#sanPn .cd i{font-style:normal;font-size:12px;color:#8fe6ff}#sanPn .cd span{display:block;font-size:12.5px;color:#a8bcc8;margin-top:3px}#sanPn .cd .pr{float:right;font:700 14px "SF Mono",Consolas,monospace;color:#8fe6ff}#sanPn .cd.on .pr{color:#ffd27a}
#sanPn .src{display:flex;flex-wrap:wrap;gap:6px}#sanPn .src span{padding:2px 9px;border:1px solid rgba(143,230,255,.25);border-radius:12px;font-size:12.5px;color:#c8e4ee;background:#0008}#sanPn .src span.c{border-color:rgba(255,210,122,.4);color:#ffd890}
#sanPn .note{margin-top:14px;font-size:12.5px;color:#8aa4b0;line-height:1.7}#sanPn .x{position:absolute;right:20px;top:14px;color:#6a8490;font-size:12px}`;
    document.head.appendChild(el);
  }
  function build() {
    if (hud && hud.isConnected) return; const c = document.getElementById('coins'); if (!c || !c.parentNode) return; css();
    hud = document.createElement('div'); hud.className = 'u-san'; hud.setAttribute('data-noi18n', ''); hud.innerHTML = '<b id="sanN">0</b><div class="u-lbl">SAN <span id="sanR"></span></div><div class="fx" id="sanFx"></div>'; c.parentNode.after(hud);
    chip = document.createElement('div'); chip.id = 'sanChip'; chip.setAttribute('data-noi18n', ''); document.body.appendChild(chip);
  }
  let lastV = -1, sigC = '';
  function paint() {
    if (!on()) { if (hud) hud.style.display = 'none'; if (chip) chip.style.display = 'none'; return; }
    build(); if (!hud) return; const s = st(), w = wild(), g = G0();
    hud.style.display = rOn() ? 'flex' : 'none';
    const nEl = hud.querySelector('#sanN'); if (s.v !== lastV) { if (lastV >= 0 && s.v > lastV) { nEl.classList.remove('bump'); void nEl.offsetWidth; nEl.classList.add('bump'); } lastV = s.v; nEl.textContent = Math.floor(s.v).toLocaleString(); }
    const r = idleRate(); hud.querySelector('#sanR').textContent = w ? '' : (r >= 0.1 ? `+${r.toFixed(1)}/s` : ''); hud.querySelector('#sanFx').textContent = sumTxt();
    // 肉鸽提示（原来塞在探索 UI 里的面板，现在只留一个角标）
    let c = ''; if (!w && g && g.playing && !g.uiOpen && window.Rogue && Rogue.on() && rOn()) { const rs = Rogue.st(); if (!rs.arch) c = '⚔️ 还没选本局杀法'; else if (rs.pend > 0) c = `🎴 祝福抉择 ×${rs.pend}`; }
    if (c !== sigC) { sigC = c; chip.innerHTML = c ? `<span>${c}<kbd>Tab → 流派</kbd></span>` : ''; chip.style.display = c ? 'flex' : 'none'; }
  }

  // ---- 面板（Hub 页）----
  let pn = null, mode = '', refreshT = 0;
  function mkPn() {
    if (pn) return pn; css(); pn = document.createElement('div'); pn.id = 'sanPn'; pn.setAttribute('data-noi18n', '');
    ['mousedown', 'pointerdown', 'wheel', 'contextmenu'].forEach(ev => pn.addEventListener(ev, e => e.stopPropagation()));
    pn.addEventListener('click', e => {
      const t = e.target.closest('[data-b],[data-e],[data-x]'); if (!t || mode !== 'san') return; if (t.classList.contains('poor')) { fail('SAN 不够'); return; }
      let ok = false; if (t.dataset.b) ok = buyBuff(t.dataset.b); else if (t.dataset.e) ok = buyEnch(t.dataset.e); else if (t.dataset.x) ok = buySpecial(t.dataset.x);
      if (ok) { try { G0().save(); } catch (x) { } render(); }
    });
    document.body.appendChild(pn); return pn;
  }
  function sanHTML() {
    const s = st(), ck = chapK(), r = idleRate();
    // 来源统计：在岗首级 → SAN 型 / 魂晶型
    const g = G0(), C = (window.BuildCat && BuildCat.C) || {}, cnt = { san: {}, coin: {} };
    for (const h of (g.heads || [])) { if (!h || !h.mount) continue; const k = kind(h.mount.type); if (k !== 'san' && k !== 'coin') continue; const d = C[h.mount.type]; if (!d) continue; const o = cnt[k][h.mount.type] = cnt[k][h.mount.type] || { ic: d.icon, n: d.n, k: 0 }; o.k++; }
    const chips = k => Object.values(cnt[k]).map(o => `<span class="${k === 'coin' ? 'c' : ''}">${o.ic} ${o.n} ×${o.k}</span>`).join('') || '<span style="opacity:.6">（暂无首级在岗）</span>';
    let h = `<div class="x">Esc / Tab 关闭 · 效果只管「下一趟」，回洞即消散</div><h2>🌀 SAN 祭坛</h2><div class="top"><span class="n" id="sanBig">${Math.floor(s.v).toLocaleString()}</span><span>SAN</span><span>挂机产量 <b>${r >= 0.1 ? '+' + r.toFixed(1) : '0'}/s</b>${s.fz > 0 ? ` · <b style="color:#ffd27a">⚡躁动 ×2（${Math.ceil(s.fz)}s）</b>` : ''}</span><span>累计 <b>${Math.floor(s.tot).toLocaleString()}</b></span><span>当前计价：第 ${Loop.R().chap} 章 ×${ck.toFixed(2)}</span></div>`;
    h += `<h3>产出来源 <small>左键把玩首级 · 低阶建筑计时 · 魂轮 · 离洞挂机（×${AWAY}）</small></h3><div class="src">${chips('san')}</div><div class="src" style="margin-top:6px">${chips('coin')}</div><div class="note" style="margin-top:6px">🌀 蓝色 = SAN 型建筑（倍率 &lt; ${COIN_MULT}，洞里持续产 SAN）；🔮 金色 = 魂晶型（高倍率 / 祭仪厅，回合结算时才发魂晶，稀有）。建造菜单里每座建筑名字后面有标记。</div>`;
    h += `<h3>⚔️ 武器附魔 <small>选一个；这一趟有效，用完消散。换附魔会退还原来的 SAN</small></h3><div class="grid">${ENCH.map(e => { const c = Math.round(ECOST * ck), on = s.arm.e === e.k; return `<div class="cd ${on ? 'on' : ''} ${!on && s.v + (s.arm.e ? s.arm.ep : 0) < c ? 'poor' : ''}" data-e="${e.k}" data-c="${c - (s.arm.e ? s.arm.ep : 0)}"><span class="pr">${on ? '已附魔' : c}</span><b>${e.ic} ${e.n}</b><span>${e.d}</span></div>`; }).join('')}</div>`;
    h += `<h3>🎐 下一趟增益 <small>可叠到 ${BMAX} 层，越叠越贵；和建筑给的「下一趟祝福」叠加</small></h3><div class="grid">${BUFFS.map(b => { const own = s.arm.b[b.k] || 0, max = own >= BMAX, c = costOf(b, own); return `<div class="cd ${max ? 'max on' : ''} ${!max && s.v < c ? 'poor' : ''}" data-b="${b.k}" data-c="${max ? 1e12 : c}"><span class="pr">${max ? '已满' : c}</span><b>${b.ic} ${b.n}${own ? ` ×${own}` : ''}</b><i>${b.d(own + 1)}</i><span>${own ? `当前：${b.d(own)}` : '下一趟生效'}</span></div>`; }).join('')}</div>`;
    const incc = Math.round(XCOST * ck), inc = Loop.R().inc || 0, bc = bcost(), fc = Math.round(FCOST * ck);
    h += `<h3>✨ 特别仪式</h3><div class="grid">
<div class="cd ${s.fz > FRENZY_SEC / 2 ? 'on' : ''} ${s.fz <= FRENZY_SEC / 2 && s.v < fc ? 'poor' : ''}" data-x="frenzy" data-c="${s.fz > FRENZY_SEC / 2 ? 1e12 : fc}"><span class="pr">${fc}</span><b>⚡ 躁动</b><span>${FRENZY_SEC} 秒内 SAN 产量 ×2——滚雪球用</span></div>
<div class="cd ${inc >= 0.35 ? 'max on' : ''} ${inc < 0.35 && s.v < incc ? 'poor' : ''}" data-x="incense" data-c="${inc >= 0.35 ? 1e12 : incc}"><span class="pr">${incc}</span><b>🕯️ 魂晶香</b><span>下一次回合结算的魂晶 +10%（现在 +${Math.round(inc * 100)}%，最多 +35%）——把 SAN 换成稀有的魂晶</span></div>
${window.Rogue && Rogue.on() ? `<div class="cd ${s.v < bc ? 'poor' : ''}" data-x="boon" data-c="${bc}"><span class="pr">${bc}</span><b>🎴 月光窥视</b><span>立刻 +1 次祝福抉择（本回合买得越多越贵，结算后重置）· 现有 ×${Rogue.st().pend}</span></div>` : ''}</div>`;
    h += `<div class="note">SAN 是「洞里的情绪」：首级被你把玩、被建筑挂机，就会攒出来。它不会直接变强——它只是借给你下一趟用的东西。<br>当前已备好：<b style="color:#c8f0ff">${sumTxt() || '（什么都没买）'}</b></div>`;
    return h;
  }
  function rogueHTML() { return '<div class="x">Esc / Tab 关闭</div><h2 style="color:#e0c8ff">🎴 流派 · 祝福</h2><div class="note" style="margin:0 0 12px">本局武器流派 + 回合祝福。（原来塞在“选地点”界面里，现在搬到这里；选地点时只会弹一次大选择。）</div><div id="rgHost"></div>'; }
  function render() { if (!pn) return; const sc = pn.scrollTop || 0; const box = pn.querySelector('.box') || pn.appendChild(Object.assign(document.createElement('div'), { className: 'box' })); if (mode === 'san') box.innerHTML = sanHTML(); else { box.innerHTML = rogueHTML(); try { Rogue.mount(box.querySelector('#rgHost')); } catch (e) { console.warn('rogue mount', e); } } pn.scrollTop = sc; }
  function softRefresh() {
    if (!pn || mode !== 'san') return; const s = st(), big = pn.querySelector('#sanBig'); if (big) big.textContent = Math.floor(s.v).toLocaleString();
    pn.querySelectorAll('.cd[data-c]').forEach(el => el.classList.toggle('poor', s.v < +el.dataset.c));
  }
  function open(m) {
    mkPn(); if (pn.classList.contains('on') && mode === m) return; mode = m; pn.classList.add('on'); const g = G0(); try { if (g && g.setUIOpen) g.setUIOpen(true); document.exitPointerLock && document.exitPointerLock(); sfx('open'); } catch (e) { }
    pn.innerHTML = ''; render(); clearInterval(refreshT); refreshT = setInterval(() => { if (mode === 'san') softRefresh(); }, 350);
  }
  function close() { if (!pn || !pn.classList.contains('on')) return; pn.classList.remove('on'); mode = ''; clearInterval(refreshT); const g = G0(); try { if (g && g.setUIOpen) g.setUIOpen(false); sfx('close'); } catch (e) { } }
  const isOpen = m => !!(pn && pn.classList.contains('on') && mode === m);
  addEventListener('keydown', e => {
    if (!on() || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; const a = document.activeElement; if (a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable)) return;
    if (e.code === 'Escape' && pn && pn.classList.contains('on')) { e.preventDefault(); e.stopImmediatePropagation(); if (window.Hub) Hub.closeAll(); else close(); return; }
    if (e.code === 'Backquote') { const g = G0(); if (!g || !g.playing || wild()) return; if (isOpen('san')) { e.preventDefault(); e.stopImmediatePropagation(); window.Hub ? Hub.closeAll() : close(); return; } if (g.uiOpen || !rOn() || (window.GrandUI && GrandUI.isOpen())) return; e.preventDefault(); e.stopImmediatePropagation(); window.Hub ? Hub.go('san') : open('san'); }
  }, true);
  function reg() {
    if (!window.Hub || !Hub.PAGES || Hub.PAGES.some(p => p.id === 'san')) return;
    const i = Math.max(0, Hub.PAGES.findIndex(p => p.id === 'talents')) + 1;
    Hub.PAGES.splice(i, 0,
      { id: 'san', g: 'role', ic: '🌀', k: '`', n: { zh: 'SAN 祭坛', ja: 'SAN祭壇', en: 'SAN altar' }, isOpen: () => isOpen('san'), open: () => open('san'), close, ok: () => on() && rOn(), cave: 1 },
      { id: 'rogue', g: 'role', ic: '🎴', k: '', n: { zh: '流派 · 祝福', ja: '流派・祝福', en: 'Style & boons' }, isOpen: () => isOpen('rogue'), open: () => open('rogue'), close, ok: () => !!(on() && window.Rogue && Rogue.on() && rOn()), cave: 1 });
  }
  reg();
  let last = performance.now();
  setInterval(() => { try { const t = performance.now(), dt = Math.min(1, (t - last) / 1000); last = t; if (!G0() || !G0().S) return; reg(); if (on()) tick(dt); paint(); } catch (e) { console.warn('san', e); } }, 200);
  return { on, live, kind, badge, gain, nb, event, endTrip, st, idleRate, buyBuff, buyEnch, buySpecial, open, close, BUFFS, ENCH, K, POKE };
})();
