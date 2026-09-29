// 第二十一轮：手感 / 沉浸 MOD（三个独立开关，全部只挂 G.HOOK，不改 game.js）
//  feel_bubble  把玩旁白：低频、打字机动画的小字卡，描述你正在怎么摆弄首级（第三人称旁白；首级从不说话）
//  feel_impact  落地手感：按速度的尘土圈 + 按落点材质的声音（石地/木面/另一颗首级）+ 重摔时镜头轻踢
//  feel_heft    重量感：每颗首级有自己的“分量”，拿起时手往下一沉、转身时滞后摆动、走路时上下颠
(function () {
  'use strict';
  const on = id => !window.Mods || Mods.on(id);
  const V3 = THREE.Vector3;
  let G = null;

  // ---------- 分量：稀有度 + 名字哈希，稳定不变 ----------
  function hashS(s) { let h = 2166136261; s = String(s || ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  function heftOf(h) {
    if (!h || !h.rec) return 1;
    if (h._heft) return h._heft;
    const c = h.rec.c || {}; const r = hashS((c.name || '') + (h.rec.id || ''));
    return (h._heft = 0.75 + r * 0.6 + (c.rar || 0) * 0.08); // 0.75 ~ 1.7
  }
  const heftWord = k => k < 0.9 ? '轻飘飘的' : k < 1.15 ? '分量刚好' : k < 1.4 ? '沉甸甸的' : '压手得很';

  // ---------- 旁白卡 ----------
  let box = null, boxT = 0, typeT = 0, typeS = '', lastSay = -99, clock = 0;
  const cool = {};
  function ensureBox() {
    if (box) return box;
    box = document.createElement('div'); box.className = 'log'; box.id = 'feelBubble';
    Object.assign(box.style, { position: 'fixed', left: '50%', bottom: '19%', transform: 'translate(-50%, 8px)', maxWidth: '420px', padding: '8px 16px', fontSize: '14px', lineHeight: '1.55',
      color: '#eadfc8', background: 'rgba(14,9,7,.72)', border: '1px solid rgba(231,194,122,.35)', borderRadius: '3px', pointerEvents: 'none', opacity: '0', transition: 'opacity .45s, transform .45s', zIndex: 30, textAlign: 'center', letterSpacing: '.03em', fontStyle: 'italic' });
    document.body.appendChild(box); return box;
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m);
  // 低频：全局 ≥11s 一条；同类 ≥40s；重要事件（prio）可以只隔 5s
  function say(kind, vars, prio) {
    if (!on('feel_bubble')) return;
    if (clock - lastSay < (prio ? 5 : 11)) return;
    if (clock - (cool[kind] || -99) < 40) return;
    const pool = LINES[kind]; if (!pool) return;
    cool[kind] = clock; lastSay = clock;
    ensureBox(); typeS = fill(pick(pool), vars || {}); typeT = 0; boxT = 4.2 + typeS.length * 0.045;
    box.textContent = ''; box.style.opacity = '1'; box.style.transform = 'translate(-50%, 0)';
  }
  function tickBox(dt) {
    if (!box || boxT <= 0) return;
    boxT -= dt; typeT += dt;
    const n = Math.min(typeS.length, Math.floor(typeT * 28));
    if (box.textContent.length !== n) box.textContent = typeS.slice(0, n);
    if (boxT <= 0) { box.style.opacity = '0'; box.style.transform = 'translate(-50%, 8px)'; }
  }
  const LINES = {
    pick: ['你把「{n}」捧了起来——{w}。', '「{n}」落进你掌心，{w}，还带着一点洞里的凉意。', '你掂了掂「{n}」。嗯，{w}。'],
    holdLong: ['你已经捧着「{n}」发呆好一会儿了。它也不催你。', '「{n}」的发梢随你的呼吸轻轻晃。洞窟很安静。', '你和「{n}」对视了很久，最后是你先移开了目光。'],
    spinHand: ['你把「{n}」在手里转了一圈又一圈，像在挑一只西瓜。', '「{n}」被你转得晕头转向，头发都甩乱了。'],
    pokeMany: ['你连戳了「{n}」{c}下。它的表情写满了“够了”。', '戳、戳、戳——「{n}」的脸颊软得不讲道理。'],
    throwFar: ['「{n}」划出一道弧线，飞了 {d} 米。洞窟的回声替它喝了彩。', '嗖——「{n}」越过火光，落在 {d} 米外。', '好一记长传！「{n}」飞出 {d} 米。'],
    bounce: ['咚、咚、咚——「{n}」弹了 {c} 下，像一颗不服气的皮球。', '「{n}」连弹 {c} 下才停，好像还想再来一次。'],
    spinAir: ['「{n}」在空中翻了好几个跟头，发丝甩成一道弧。', '「{n}」转得像个陀螺，落地前还在打旋。'],
    roll: ['「{n}」骨碌碌滚过石地，最后歪着脸停下了。', '「{n}」一路滚到墙角，像只找窝的猫。'],
    stack: ['「{n}」稳稳落在另一颗首级头顶上。叠罗汉，成功。', '一颗摞一颗——「{n}」找到了新的座位。'],
    gentle: ['你把「{n}」轻轻放稳，像摆好一件瓷器。', '「{n}」被端端正正地安置好了，发丝也理顺了。'],
    heavyDrop: ['「{n}」重重砸在地上，尘土扬起一圈。{w}，果然。', '砰！「{n}」落地的闷响在洞里回荡了好久。'],
    crowd: ['你脚边已经围了 {c} 颗首级，洞里热闹得像集市。', '{c} 颗首级安静地陪着你。今晚的火光格外暖。'],
    hoard: ['「{n}」被你捡起、放下、又捡起。你们大概很合得来。']
  };

  // ---------- 状态跟踪 ----------
  let prevHeld = null, holdT = 0, heldTurn = 0, pokeC = 0, pokeT = 0, lastYaw = null, yawRate = 0;
  const fly = new Map(); // head -> {t0,p0,b,spin,throwN}
  const touch = new Map(); // head -> 被拿起次数
  let crowdT = 0, kick = 0, kickV = 0;
  // heft 偏移（pre 里加上，下一帧 frame 里撤掉，避免与 game.js 的 lerp 累积）
  let heftOff = new V3(), heftHead = null, dip = 0, dipV = 0, swayX = 0, swayV = 0, bobP = 0;

  function nameOf(h) { return (h && h.rec && h.rec.c && h.rec.c.name) || '它'; }
  function below(h) {
    const p = h.g.position;
    for (const o of G.heads) { if (o === h || !o.g) continue; const q = o.g.position; if (Math.abs(q.x - p.x) < 0.2 && Math.abs(q.z - p.z) < 0.2 && q.y < p.y - 0.08 && q.y > p.y - 0.45) return o; }
    return null;
  }
  function floorY(p) { const c = G.cave; return c && c.floorAt ? c.floorAt(p.x, p.z) : 0; }

  function landing(h, v) {
    const p = h.g.position, k = Math.min(1, v / 7), hk = heftOf(h);
    const onHead = below(h), fy = floorY(p), high = p.y - fy > 0.3;
    if (on('feel_impact') && v > 1.2) {
      // 材质音：另一颗首级（软）/ 台面（木）/ 石地（闷+碎石）
      if (onHead) { SFX.play('sack', 0.25 + k * 0.4, 1.25 - k * 0.2); SFX.squish(0.25 + k * 0.4); }
      else if (high) SFX.play('wood', 0.2 + k * 0.5, 0.95 + Math.random() * 0.15);
      else { SFX.play('mine', 0.08 + k * 0.28 * hk, 0.55 + (1 - k) * 0.25); }
      // 尘土圈：速度越快越大；重的头更多
      if (!onHead) {
        const gp = p.clone(); gp.y = (high ? p.y - 0.12 : fy + 0.02);
        G.burst(gp, high ? '#9a7a55' : '#b9a78a', Math.round(4 + 14 * k * hk), 0.35 + 0.9 * k, 0.55 + 0.3 * k, -1.5);
      }
      // 镜头轻踢：近处重摔
      const d = G.player.pos.distanceTo(p);
      if (v > 4 && d < 6) kickV -= (0.035 * k * hk) * (1 - d / 6);
    }
    if (on('feel_bubble')) {
      if (onHead && v < 5) say('stack', { n: nameOf(h) });
      else if (v > 6.5 && hk > 1.3) say('heavyDrop', { n: nameOf(h), w: heftWord(hk) });
    }
  }

  function frame(dt) {
    clock += dt;
    // 撤掉上一帧的 heft 偏移
    if (heftHead && heftHead.g) heftHead.g.position.sub(heftOff);
    heftOff.set(0, 0, 0); heftHead = null;
    tickBox(dt);
    if (!G.playing) return;
    const held = G.held;
    // 转身速度（heft 摆动 / 手中转圈）
    const yaw = G.player.yaw; if (lastYaw != null) { let d = yaw - lastYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yawRate += (d / Math.max(dt, 1e-3) - yawRate) * Math.min(1, dt * 12); } lastYaw = yaw;

    // 拿起 / 放下
    if (held !== prevHeld) {
      if (prevHeld && !held) {
        const h = prevHeld, sp = h.vel ? h.vel.length() : 0;
        if (sp > 4) fly.set(h, { t0: clock, p0: h.g.position.clone(), b: 0, spin: 0, lastVy: h.vel.y, air: true, thrown: true });
        else if (h.mount) {} else if (sp < 0.5) say('gentle', { n: nameOf(h) });
      }
      if (held) {
        holdT = 0; heldTurn = 0; pokeC = 0;
        const hk = heftOf(held); dipV -= 0.9 * hk; // 手往下一沉
        const n = (touch.get(held) || 0) + 1; touch.set(held, n);
        if (n >= 4) say('hoard', { n: nameOf(held) }); else say('pick', { n: nameOf(held), w: heftWord(hk) });
        if (on('feel_heft')) SFX.play('sack', 0.12 + 0.12 * hk, 1.3 - 0.25 * hk);
      }
      prevHeld = held;
    }
    if (held) {
      holdT += dt;
      if (holdT > 26) { say('holdLong', { n: nameOf(held) }); }
      // 手里转圈：用四元数变化率（滚轮转向/把玩都会导致）
      const q = held.g.quaternion; if (held._fq) { const dq = 2 * Math.acos(Math.min(1, Math.abs(q.dot(held._fq)))); heldTurn += dq; } else held._fq = new THREE.Quaternion(); held._fq.copy(q);
      if (heldTurn > Math.PI * 6) { say('spinHand', { n: nameOf(held) }); heldTurn = 0; }
      if (pokeT > 0) pokeT -= dt; else pokeC = 0;
    }

    // 飞行中的首级：弹跳计数、空中旋转、落地
    for (const h of G.heads) {
      if (!h.g || h === held || h.mount) continue;
      let f = fly.get(h); const vy = h.vel.y, sp = h.vel.length();
      if (!f) { if ((sp > 3 && vy > 0.5) || vy < -2.2) { f = { t0: clock, p0: h.g.position.clone(), b: 0, spin: 0, lastVy: vy, air: true }; fly.set(h, f); } else { h._fvy = vy; continue; } }
      if (h.av) f.spin += h.av.length() * dt;
      // 落地：竖直速度由向下变为不向下
      if (f.lastVy < -1.2 && vy > f.lastVy * 0.5) { landing(h, -f.lastVy); f.b++; }
      f.lastVy = vy;
      if (sp < 0.25 && clock - f.t0 > 0.4 || clock - f.t0 > 9) {
        fly.delete(h);
        const d = Math.hypot(h.g.position.x - f.p0.x, h.g.position.z - f.p0.z);
        if (f.thrown && d > 7) say('throwFar', { n: nameOf(h), d: d.toFixed(1) }, true);
        else if (f.b >= 4) say('bounce', { n: nameOf(h), c: f.b });
        else if (f.spin > Math.PI * 7) say('spinAir', { n: nameOf(h) });
        else if (d > 3 && f.b >= 2) say('roll', { n: nameOf(h) });
      }
    }
    if (fly.size > 64) fly.clear();

    // 人气
    crowdT -= dt; if (crowdT <= 0) { crowdT = 5; let c = 0; const pp = G.player.pos; for (const h of G.heads) if (h.g && !h.mount && h.g.position.distanceToSquared(pp) < 9) c++; if (c >= 8) say('crowd', { c }); }
  }

  function pre(dt) {
    if (!G.playing) return;
    // 镜头轻踢（阻尼弹簧），game.js 每帧重设相机，这里只加偏移
    if (on('feel_impact')) { kickV += (-kick * 90 - kickV * 14) * dt; kick += kickV * dt; if (Math.abs(kick) > 1e-4) { G.camera.position.y += kick; G.camera.rotateX(kick * 0.8); } }
    else { kick = kickV = 0; }
    const held = G.held;
    if (!held || !held.g || !on('feel_heft')) { dip = dipV = swayX = swayV = 0; return; }
    const hk = heftOf(held);
    // 下沉弹簧（重的沉得深、回得慢）
    dipV += (-dip * (60 / hk) - dipV * (9 / Math.sqrt(hk))) * dt; dip += dipV * dt;
    // 转身滞后
    const tgt = Math.max(-1, Math.min(1, -yawRate * 0.05 * hk));
    swayV += ((tgt - swayX) * 50 - swayV * 10) * dt; swayX += swayV * dt;
    // 走路颠簸
    const ks = G.keys || {}; const mv = ks.KeyW || ks.KeyA || ks.KeyS || ks.KeyD;
    if (mv) bobP += dt * 9; const bob = mv ? Math.abs(Math.sin(bobP)) * 0.012 * hk : 0;
    const cam = G.camera; const right = new V3(1, 0, 0).applyQuaternion(cam.quaternion);
    heftOff.set(0, dip * 0.06 - bob - 0.006 * (hk - 1), 0).addScaledVector(right, swayX * 0.09);
    held.g.position.add(heftOff); heftHead = held;
  }

  function onPoke() { // 左键把玩：只数次数（game.js 自己处理动作）
    const held = G && G.held; if (!held) return;
    pokeC++; pokeT = 1.2; if (on('feel_heft')) dipV -= 0.25 * heftOf(held);
    if (pokeC >= 9) { say('pokeMany', { n: nameOf(held), c: pokeC }); pokeC = 0; }
  }

  function init() {
    G = window.G; if (!G || !G.HOOK) return setTimeout(init, 300);
    G.HOOK.frame.push(frame); G.HOOK.pre.push(pre);
    window.addEventListener('mousedown', e => { if (e.button === 0 && G.playing && !G.uiOpen) onPoke(); }, true);
  }
  window.Feel = { heftOf, say, get _st() { return { lastSay, clock, fly: fly.size, kick, dip, swayX }; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
