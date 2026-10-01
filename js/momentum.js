// R54m MOD momentum（默认开）：「杀意」连斩系统——让战斗有节奏、有爽点。
// 5.5 秒内连续击杀叠「杀意」（命中会续一点时间，斩首/处决 +2）：伤害 +5%/层（≤+40%）、移速 +2.5%/层（≤+20%）、≥3 层时挥刀省 30% 体力、每杀回 2% 生命。
// 反馈：右侧大号连斩计数 + 倒计时条、跨档时屏幕中央砸出「双杀 / 三连斩 / 屠戮 / 修罗 / 魂首之主」、击杀魂火飞向计数器、震屏、音阶越杀越高。
window.Momentum = (() => {
  const on = () => !window.Mods || Mods.on('momentum') !== false;
  const W = () => (window.Worlds && Worlds.active ? Worlds._W : null), G = () => window.G;
  const WIN = 5.5, TIERS = [[2, '双 杀', '#ffd27a'], [3, '三 连 斩', '#ffb050'], [5, '屠 戮', '#ff7a3a'], [8, '修 罗', '#ff3a3a'], [12, '魂 首 之 主', '#e080ff']];
  const M = { n: 0, t: 0, best: 0, tier: -1 };
  const dmgK = () => (on() && M.n >= 2 ? 1 + Math.min(0.4, 0.05 * M.n) : 1), spdK = () => (on() && M.n >= 2 ? 1 + Math.min(0.2, 0.025 * M.n) : 1), stamK = () => (on() && M.n >= 3 ? 0.7 : 1);
  let el = null, slam = null;
  function css() {
    if (document.getElementById('mmCss')) return; const s = document.createElement('style'); s.id = 'mmCss'; s.textContent = `
#mmBox{position:fixed;right:36px;top:42%;z-index:32;pointer-events:none;text-align:right;font-family:"Noto Serif CJK SC","Songti SC",serif;opacity:0;transition:opacity .25s;transform-origin:100% 50%}
#mmBox.on{opacity:1}#mmBox .x{font:900 64px/1 "Noto Serif CJK SC",serif;color:var(--c);text-shadow:0 0 18px var(--c),0 3px 0 #000,0 0 2px #000;letter-spacing:-2px}
#mmBox .x small{font-size:30px;margin-right:2px}#mmBox .nm{font:800 18px "Noto Serif CJK SC",serif;color:#fff;letter-spacing:.3em;text-shadow:0 2px 6px #000}
#mmBox .bf{font:600 13px "Microsoft YaHei UI",sans-serif;color:#ffe8c8;text-shadow:0 1px 4px #000;margin-top:2px}
#mmBox .bar{width:180px;height:5px;margin:6px 0 0 auto;background:#0008;border:1px solid #ffffff30}#mmBox .bar i{display:block;height:100%;background:linear-gradient(90deg,#ff3a2a,var(--c));transform-origin:100% 50%}
#mmBox.pop{animation:mmPop .22s ease-out}@keyframes mmPop{0%{transform:scale(1.45)}100%{transform:scale(1)}}
#mmSlam{position:fixed;left:50%;top:30%;z-index:33;pointer-events:none;transform:translate(-50%,-50%);text-align:center;opacity:0}
#mmSlam.on{animation:mmSlam 1.25s cubic-bezier(.2,1.4,.3,1) forwards}#mmSlam b{display:block;font:900 clamp(48px,7vw,104px)/1 "Noto Serif CJK SC",serif;color:var(--c);letter-spacing:.12em;text-shadow:0 0 30px var(--c),0 6px 0 #2a0505,0 0 3px #000}
#mmSlam span{display:block;margin-top:6px;font:700 17px "Microsoft YaHei UI",sans-serif;color:#fff2e0;letter-spacing:.2em;text-shadow:0 2px 6px #000}
@keyframes mmSlam{0%{opacity:0;transform:translate(-50%,-50%) scale(2.6)}12%{opacity:1;transform:translate(-50%,-50%) scale(.94)}20%{transform:translate(-50%,-50%) scale(1)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-62%) scale(1.04)}}
.mmW{position:fixed;z-index:32;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,#fff 0,#ffb060 40%,transparent 70%);box-shadow:0 0 12px #ff8a3a;transition:left .55s cubic-bezier(.5,0,.8,.6),top .55s cubic-bezier(.2,.4,.5,1),opacity .55s}`; document.head.appendChild(s);
  }
  function ensure() { if (el) return; css(); el = document.createElement('div'); el.id = 'mmBox'; el.innerHTML = '<div class="x"></div><div class="nm"></div><div class="bf"></div><div class="bar"><i></i></div>'; document.body.appendChild(el); slam = document.createElement('div'); slam.id = 'mmSlam'; document.body.appendChild(slam); }
  const tierOf = n => { let t = -1; TIERS.forEach((x, i) => { if (n >= x[0]) t = i; }); return t; };
  const col = () => (TIERS[Math.max(0, tierOf(M.n))] || TIERS[0])[2];
  function wisps(fo) {
    try { const cam = G().camera, p = fo.pos.clone(); p.y += 1.2; p.project(cam); if (p.z > 1) return; const x0 = (p.x + 1) / 2 * innerWidth, y0 = (1 - p.y) / 2 * innerHeight, r = el.getBoundingClientRect(), x1 = r.right - 40, y1 = r.top + 30;
      for (let i = 0; i < 6; i++) { const w = document.createElement('div'); w.className = 'mmW'; w.style.left = (x0 + (Math.random() - 0.5) * 60) + 'px'; w.style.top = (y0 + (Math.random() - 0.5) * 60) + 'px'; document.body.appendChild(w); setTimeout(() => { w.style.left = x1 + 'px'; w.style.top = y1 + 'px'; w.style.opacity = '0.2'; }, 30 + i * 40); setTimeout(() => w.remove(), 700 + i * 40); } } catch (e) { }
  }
  function add(k, fo) {
    const w = W(); if (!w) return; ensure(); const t0 = tierOf(M.n); M.n += k; M.t = WIN; M.best = Math.max(M.best, M.n);
    if (fo) wisps(fo); w.shake = Math.max(w.shake || 0, 0.18 + Math.min(0.3, M.n * 0.03));
    try { SFX.soul && SFX.soul(Math.min(10, M.n), 3); } catch (e) { }
    if (M.n >= 3) try { const s = G().st(); G().S.hp = Math.min(s.maxHp, G().S.hp + s.maxHp * 0.02); } catch (e) { }
    const t1 = tierOf(M.n); if (t1 > t0 && t1 >= 0) { const T = TIERS[t1]; slam.style.setProperty('--c', T[2]); slam.innerHTML = `<b>${T[1]}</b><span>伤害 +${Math.round((dmgK() - 1) * 100)}% · 移速 +${Math.round((spdK() - 1) * 100)}%${M.n >= 3 ? ' · 嗜血回复 · 省力' : ''}</span>`; slam.classList.remove('on'); void slam.offsetWidth; slam.classList.add('on'); try { SFX.fanfare && SFX.fanfare(Math.min(4, t1 + 1)); } catch (e) { } }
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); draw();
  }
  function draw() {
    if (!el) return; const show = M.n >= 1 && !!W(); el.classList.toggle('on', show); if (!show) return; const t = tierOf(M.n), T = TIERS[Math.max(0, t)];
    el.style.setProperty('--c', t >= 0 ? T[2] : '#e8d8c0'); el.querySelector('.x').innerHTML = `<small>×</small>${M.n}`; el.querySelector('.nm').textContent = t >= 0 ? T[1].replace(/ /g, '') : '杀 意';
    el.querySelector('.bf').textContent = M.n >= 2 ? `伤害 +${Math.round((dmgK() - 1) * 100)}% · 移速 +${Math.round((spdK() - 1) * 100)}%` : '5 秒内再杀一个'; el.querySelector('.bar i').style.transform = `scaleX(${Math.max(0, M.t / WIN)})`;
  }
  const HS = { hit: [0.06, 0.07, 0.12], kill: [0.08, 0.16, 0.32], parry: [0.04, 0.42, 0.35], guardbreak: [0.07, 0.22, 0.4], perfectdodge: [0.12, 0.55, 0.2], execute: [0.06, 0.3, 0.5] };
  function hitStop(t) { // R54p：命中顿帧（只冻敌人那一侧）+ 镜头震动
    const h = HS[t]; if (!h || (window.Mods && Mods.on('hit_stop') === false) || (window.DecapCam && DecapCam.active)) return;
    try { if (window.Foe && Foe.slowSet) Foe.slowSet(h[0], h[1]); const w = W(); if (w) w.shake = Math.max(w.shake || 0, h[2]); } catch (e) { }
  }
  function event(t, fo, d) {
    if (!W()) return; hitStop(t); if (!on()) return;
    if (t === 'kill') add(1, fo);
    else if (t === 'execute' || t === 'onecut' || t === 'decapAlive') add(1, null); // kill 事件已经先 +1，这里是斩首/处决的额外 +1
    else if (t === 'decap') { if (M.n > 0) M.t = WIN; }
    else if (t === 'hit' && M.n > 0) M.t = Math.min(WIN, M.t + 0.5);
  }
  let last = performance.now();
  setInterval(() => {
    const now = performance.now(), dt = Math.min(0.2, (now - last) / 1000); last = now; const w = W();
    if (!w) { if (M.n) { M.n = 0; M.t = 0; } if (el) el.classList.remove('on'); return; }
    if (M.n > 0 && !w.busy && !w.dead) { M.t -= dt; if (M.t <= 0) { if (M.n >= 3) try { G().toast(`杀意消退 · 这一波 ×${M.n}`, '#e8c8a0', 1.6); } catch (e) { } M.n = 0; M.t = 0; } }
    draw();
  }, 50);
  return { on, event, dmgK, spdK, stamK, get M() { return M; } };
})();
