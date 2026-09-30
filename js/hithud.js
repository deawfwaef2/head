// 第二十六轮(g)：命中 HUD（MOD hit_hud，默认开）—— 用户反馈“每次打就是冒一堆数字 / 角色永远打不死”
//   · 伤害数字合并：同一个目标 1.2 秒内的连续命中合成一个数字（累计总伤害 + “×N 连”），每次命中弹跳放大，不再一刀一个数字堆满屏幕
//   · 敌人血条：被打中的敌人/野兽头顶出现血条（红=当前血，白=刚掉的血慢慢缩回），5 秒不挨打就淡出；击杀时血条闪白消失
//     —— 让玩家看得见“还差几刀”，不会觉得打不死
//   · 只接管“数字”伤害；文字（闪/✚治疗/+🔮奖励）仍走 worlds.js 原来的飘字
//   · worlds.js floatDmg 首行一个钩子：HitHud.dmg(pos,n,big) 返回 true 表示已处理。关掉 MOD = 原来的飘字、无血条
window.HitHud = (() => {
  'use strict';
  const on = () => !window.Mods || Mods.on('hit_hud') !== false;
  let root = null, raf = 0;
  const NUM = [];            // {el, pos(ref), p(copy), total, n, t, big}
  const BAR = new Map();     // target -> {el, fill, chip, name, last, hp, chipHp, t, dead}
  const _v = (window.THREE ? new THREE.Vector3() : null);
  function css() {
    if (document.getElementById('hitHudCss')) return;
    const s = document.createElement('style'); s.id = 'hitHudCss';
    s.textContent = `#hitHud{position:fixed;inset:0;pointer-events:none;z-index:25;overflow:hidden}
#hitHud .hn{position:absolute;transform:translate(-50%,-100%);font-weight:900;color:#ffe6b0;text-shadow:0 2px 3px #000,0 0 10px #000a;white-space:nowrap;font-family:system-ui,sans-serif;will-change:transform}
#hitHud .hn i{font-style:normal;font-size:.5em;color:#ffd0a0;margin-left:3px;vertical-align:super}
#hitHud .hn.big{color:#ff7a50}
#hitHud .hn.pop{animation:hnpop .18s ease-out}
@keyframes hnpop{0%{transform:translate(-50%,-100%) scale(1.55)}100%{transform:translate(-50%,-100%) scale(1)}}
#hitHud .hb{position:absolute;transform:translate(-50%,-100%);width:78px;text-align:center;transition:opacity .4s}
#hitHud .hb .nm{font-size:11px;color:#f0e0d0;text-shadow:0 1px 2px #000;white-space:nowrap;margin-bottom:2px;font-family:system-ui,sans-serif}
#hitHud .hb .tr{position:relative;height:7px;background:#000b;border:1px solid #0009;border-radius:4px;overflow:hidden;box-shadow:0 1px 3px #0008}
#hitHud .hb .ch{position:absolute;left:0;top:0;bottom:0;background:#fff;opacity:.85}
#hitHud .hb .fl{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(#ff6a5a,#c0182a)}
#hitHud .hb.beast .fl{background:linear-gradient(#ffb060,#c06010)}
#hitHud .hb.kill .tr{background:#fff;box-shadow:0 0 12px #fff}`;
    document.head.appendChild(s);
  }
  function ensure() {
    if (root && root.isConnected) return root;
    css(); root = document.createElement('div'); root.id = 'hitHud'; document.body.appendChild(root);
    return root;
  }
  function proj(p, dy) { // 世界坐标 → 屏幕像素；背后/太远返回 null
    const cam = window.G && G.camera; if (!cam || !_v) return null;
    _v.copy(p); _v.y += dy;
    const dx = _v.x - cam.position.x, dz = _v.z - cam.position.z; if (dx * dx + dz * dz > 30 * 30) return null;
    _v.project(cam); if (_v.z > 1 || _v.z < -1) return null;
    return [(_v.x + 1) / 2 * innerWidth, (1 - _v.y) / 2 * innerHeight];
  }
  // ---------------- 合并伤害数字 ----------------
  function dmg(pos, n, big) {
    if (!on() || typeof n !== 'number' || !pos || !_v) return false;
    ensure(); start();
    const now = performance.now();
    let e = null;
    for (const x of NUM) if (x.pos === pos || (now - x.last < 1200 && x.p.distanceToSquared(pos) < 0.9)) { e = x; break; }
    if (!e) {
      const el = document.createElement('div'); el.className = 'hn'; root.appendChild(el);
      e = { el, pos, p: pos.clone(), total: 0, n: 0, last: now, big: false, rise: 0 }; NUM.push(e);
    }
    e.total += n; e.n++; e.last = now; e.big = e.big || !!big; e.p.copy(pos); e.rise = 0;
    const fs = Math.min(40, 20 + Math.sqrt(e.total) * 1.6 + (big ? 6 : 0));
    e.el.style.fontSize = fs.toFixed(0) + 'px'; e.el.className = 'hn' + (e.big ? ' big' : '');
    e.el.innerHTML = e.total + (e.n > 1 ? `<i>×${e.n}</i>` : '');
    void e.el.offsetWidth; e.el.classList.add('pop');
    return true;
  }
  // ---------------- 血条 ----------------
  function bar(key, cls, name) {
    let b = BAR.get(key); if (b) return b;
    const el = document.createElement('div'); el.className = 'hb ' + cls;
    el.innerHTML = `<div class="nm"></div><div class="tr"><div class="ch"></div><div class="fl"></div></div>`;
    root.appendChild(el);
    b = { el, nm: el.querySelector('.nm'), fill: el.querySelector('.fl'), chip: el.querySelector('.ch'), hp: -1, chipHp: 1, t: 0, dead: 0 };
    b.nm.textContent = name || ''; BAR.set(key, b); return b;
  }
  function track(key, cls, name, hp, max, dead, pos, dy, dt) {
    let b = BAR.get(key);
    const f = Math.max(0, Math.min(1, hp / Math.max(1, max)));
    if (!b) { if (dead || f >= 0.999) return; b = bar(key, cls, name); b.hp = f; b.chipHp = f; b.t = 5; }
    if (f < b.hp - 1e-4) { b.t = 5; } // 刚挨打：重新显示
    if (dead && !b.dead) { b.dead = 0.5; b.el.classList.add('kill'); b.hp = 0; }
    b.hp = dead ? 0 : f;
    b.chipHp = b.chipHp > b.hp ? Math.max(b.hp, b.chipHp - dt * (b.chipHp - b.hp > 0.2 ? 0.9 : 0.45)) : b.hp;
    b.t -= dt; if (b.dead) b.dead -= dt;
    const s = (b.dead ? b.dead > 0 : b.t > 0) ? proj(pos, dy) : null;
    if (!s) { b.el.style.opacity = '0'; if (b.dead && b.dead <= 0 || (!b.dead && b.t < -1)) { b.el.remove(); BAR.delete(key); } return; }
    b.el.style.opacity = String(Math.min(1, b.dead ? b.dead * 2 : b.t)); b.el.style.left = s[0] + 'px'; b.el.style.top = s[1] + 'px';
    b.fill.style.width = (b.hp * 100).toFixed(1) + '%'; b.chip.style.width = (b.chipHp * 100).toFixed(1) + '%';
  }
  let lastT = 0;
  function frame(now) {
    raf = 0;
    const active = window.Worlds && Worlds.active && on() && !document.body.classList.contains('film');
    if (!root) return;
    root.style.display = active ? '' : 'none';
    if (!active) { if (NUM.length || BAR.size) { NUM.forEach(e => e.el.remove()); NUM.length = 0; BAR.forEach(b => b.el.remove()); BAR.clear(); } lastT = now; raf = requestAnimationFrame(frame); return; }
    const dt = Math.min(0.1, Math.max(0, (now - (lastT || now)) / 1000)); lastT = now;
    // 数字：最后一次命中后 1.1 秒淡出，期间缓慢上浮
    for (let i = NUM.length - 1; i >= 0; i--) {
      const e = NUM[i], age = (now - e.last) / 1000; e.rise += dt * 0.5;
      if (age > 1.1) { e.el.remove(); NUM.splice(i, 1); continue; }
      const s = proj(e.p, 0.98 + e.rise); if (!s) { e.el.style.display = 'none'; continue; }
      e.el.style.display = ''; e.el.style.left = (s[0] + 10) + 'px'; e.el.style.top = s[1] + 'px'; e.el.style.opacity = String(Math.min(1, (1.1 - age) * 3));
    }
    // 血条
    if (window.Foe && Foe.foes) for (const fo of Foe.foes) {
      if (fo.boss || fo.escaped || !fo.anchor) continue; // 霸主有自己的大血条
      const nm = fo.per && fo.per.title ? fo.per.title.replace(/【[^】]*】/, '') : (fo.h && fo.h.c && fo.h.c.name) || '';
      track(fo, 'foe', nm, fo.hp, fo.maxHp, fo.dead, fo.anchor.pos, 0.72, dt);
    }
    if (window.Beasts && Beasts.list) for (const b of Beasts.list) { if (!b.T || !b.pos) continue; track(b, 'beast', (b.T.ico || '') + (b.T.n || ''), b.hp, b.maxHp, !b.alive, b.pos, (b.T.h || 1) + 0.35, dt); }
    for (const [k, b] of BAR) if (window.Foe && Foe.foes && !Foe.foes.includes(k) && !(window.Beasts && Beasts.list && Beasts.list.includes(k))) { b.el.remove(); BAR.delete(k); } // 换地点：清掉
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(frame); }
  function boot() { if (!on()) return; ensure(); start(); }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot(); }
  return { dmg, on, _num: NUM, _bar: BAR };
})();
