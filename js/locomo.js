// R47（R41 主管 g）MOD npc_locomo —— 人物移动自然化（用户：“人物移动像 GMod 一样不自然”）
// 病因（foe.js / foe_roles*.js / wsites.js）：各处 AI 自己挑 Walk/Jog/Sprint 并写死 timeScale，与实际移速无关 →
//   实测（UAL 动作、髋高 0.93m 的身体）：走路动画自然速度 0.80m/s，却以 1.6–1.8m/s 平移（脚底打滑 2 倍）；慢跑 2.55m/s 对 3.4–3.6m/s；
//   转身是固定角速度线性插值（机械转向）、起步/停步是指数平滑（瞬间起速）、停下时立刻切 Idle（还在滑行就站定了）。
// 做法（不改 AI 决策，只接管“怎么表现”）：
//   ① 拦截 f.play 的移动类动作（Walk/Jog/Sprint/Walk_Formal）→ 由本模块按【实际位移速度】驱动 走↔慢跑↔疾跑 三段相位同步混合，
//      每个动作的播放速率 = 实际速度 / 该动作的自然步速（按髋高缩放）→ 脚不打滑；三者按“左脚在最前”的相位对齐 → 混合时脚步不乱。
//   ② 起步/停步有加速度上限（起步 7m/s²、刹车 10m/s²；攻击突进保持原来的快速响应）。
//   ③ 转身 = 角速度弹簧（有角加速度），移动越快可转得越慢（跑步时是弧线转弯），并向转弯内侧轻微倾身。
//   ④ AI 要求站定（Idle）时如果还在滑行，先减速走完再切 Idle。攻击/受击/格挡等立即接管，照常交叉淡入。
// foe.js 只加 4 处钩子（animate 暴露 cur、转身、加速度、mixer.update 前 tick）。关 MOD = 原行为。
window.Locomo = (() => {
  const on = () => !!(window.Mods && Mods.on && Mods.on('npc_locomo'));
  // 实测（tools/test/world.html + 脚/脚趾着地点轨迹，左右脚一致）：髋高 0.93m 时自然步速 走 0.98 / 慢跑 5.9 / 疾跑 ~9.1 m/s
  //  → UAL 的 Jog 其实是快跑；AI 用 3.4m/s 慢跑 = 腿比身体快 1.7 倍（原地蹬跑步机），走路 1.7m/s = 脚往前滑。
  // vk = 自然步速 / 髋高；off = 左脚最前的归一化相位；lo/hi = 播放速率上下限（再慢就像慢动作飘着，宁可少量打滑）
  const G = [
    { k: 'walk', clips: ['Walk_Loop', 'Walk_Formal_Loop'], vk: 1.05, off: 0.958, lo: 0.5, hi: 1.8 },
    { k: 'jog', clips: ['Jog_Fwd_Loop'], vk: 6.33, off: 0.013, lo: 0.5, hi: 1.25 },
    { k: 'run', clips: ['Sprint_Loop'], vk: 9.76, off: 0.85, lo: 0.62, hi: 1.2 },
  ];
  const LOCO = new Set(['Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop']);
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const ang = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // 在 foe.js animate() 末尾调用：包一层 f.play
  function install(f) {
    if (!on() || f._L) return;
    const V = new THREE.Vector3(); let hipY = 0.93;
    try { const h = f.bones && (f.bones.hips || f.bones.Hips); if (h) { f.root.updateMatrixWorld(true); h.getWorldPosition(V); hipY = clamp((V.y - f.root.position.y) / Math.max(1e-3, f.root.scale.y), 0.6, 1.4); } } catch (e) {}
    const L = f._L = { active: false, want: 0, dir: 1, formal: false, mw: 0, phase: 0, s: 0, vf: 0, lastP: null, pend: null, hipY, acts: null, rate: 0 };
    const orig = f.play;
    f.play = (name, o = {}) => {
      if (LOCO.has(name) && !o.once && f.clips[name]) {
        L.want = 0.35; L.dir = (o.speed != null && o.speed < 0) ? -1 : 1; L.formal = name === 'Walk_Formal_Loop'; L.pend = null;
        if (!L.active) activate(f, L); f.cur = name; return L.acts && L.acts[0];
      }
      if (L.active) {
        if (/Idle|Talking|FoldArms|Torch|Lantern/.test(name) && !o.once && L.s > 0.55) { L.pend = [name, o]; return null; } // 还在滑行：减速走完再站定
        deactivate(f, L, o.fade == null ? 0.2 : o.fade);
        const a = orig(name, o); if (a && o.fade !== 0) a.fadeIn(o.fade == null ? 0.2 : o.fade); return a;
      }
      return orig(name, o);
    };
  }
  function acts(f, L) {
    if (L.acts) return L.acts;
    return (L.acts = G.map(g => { const nm = g.clips.find(c => f.clips[c]); const c = nm && f.clips[nm]; if (!c) return null; const a = f.mixer.clipAction(c); a._lg = g; a._nm = nm; return a; }));
  }
  function activate(f, L) {
    const prev = f._cur && f._cur(); const A = acts(f, L);
    if (prev && !A.includes(prev)) prev.fadeOut(0.25);
    if (f._setCur) f._setCur(null);
    for (const a of A) if (a) { a.stopFading(); a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.timeScale = 0; a.enabled = true; a.setEffectiveWeight(0); a.play(); }
    L.active = true; L.mw = prev ? 0 : 1;
  }
  function deactivate(f, L, fade) {
    L.active = false; L.pend = null;
    for (const a of L.acts || []) if (a && a.getEffectiveWeight() > 1e-3) { a.timeScale = Math.max(0.3, L.rate * a.getClip().duration) * (L.dir < 0 ? -1 : 1); a.fadeOut(fade); } else if (a) a.stop();
    if (f._setCur) f._setCur(null);
  }
  // 每帧（foe.js 在 mixer.update 前调用）
  function tick(fo, dt) {
    const f = fo.f, L = f && f._L; if (!L) return;
    const p = fo.pos; if (!L.lastP) L.lastP = p.clone();
    const dx = p.x - L.lastP.x, dz = p.z - L.lastP.z; L.lastP.copy(p);
    if (dt > 0) { const inst = Math.min(Math.hypot(dx, dz) / dt, 9), k = 1 - Math.exp(-10 * dt); L.s += (inst - L.s) * k;
      const fw = (dx * Math.sin(fo.yaw) + dz * Math.cos(fo.yaw)) / Math.max(dt, 1e-4); L.vf += (clamp(fw, -9, 9) - L.vf) * k;
      // R51 npc_strafe：平滑速度向量 → 相对朝向的移动角 rel；后退判定带滞回（>110° 进入，<95° 退出）
      L.vx = (L.vx || 0) + (clamp(dx / dt, -9, 9) - (L.vx || 0)) * k; L.vz = (L.vz || 0) + (clamp(dz / dt, -9, 9) - (L.vz || 0)) * k;
      if (Math.hypot(L.vx, L.vz) > 0.15) { L.rel = ang(Math.atan2(L.vx, L.vz) - fo.yaw); const ar = Math.abs(L.rel); if (!L.bk && ar > 1.92) L.bk = true; else if (L.bk && ar < 1.66) L.bk = false; } }
    if (fo.dead || fo.rag) { if (L.active) deactivate(f, L, 0.1); f.root.rotation.z = 0; return; }
    // 倾身：向转弯内侧，随速度
    const lean = clamp(-(fo.yawV || 0) * L.s * 0.03, -0.12, 0.12); f.root.rotation.z += (lean - f.root.rotation.z) * (1 - Math.exp(-6 * dt));
    if (!L.active) return;
    L.want -= dt;
    if (L.pend && L.s < 0.35) { const [n, o] = L.pend; L.pend = null; f.play(n, o); return; }
    const A = acts(f, L), s = L.s, hy = L.hipY, strafe = window.Stance && Stance.onS(), back = strafe && s > 0.3 && L.rel != null ? !!L.bk : (L.dir < 0 || L.vf < -0.3 * s);
    const W = G[0].vk * hy, J = G[1].vk * hy, R = G[2].vk * hy;
    // 步态权重（后退只用走路）
    let w0 = 1, w1 = 0, w2 = 0;
    if (!back && A[1]) { const b1 = smooth(W * 1.35, W * 2.3, s); w0 = 1 - b1; w1 = b1; if (A[2]) { const b2 = smooth(J * 0.98, R * 0.74, s); w1 *= 1 - b2; w2 = b2; } }
    if (L.formal) { w0 = 1; w1 = w2 = 0; }
    L.mw = Math.min(1, L.mw + dt / 0.25);
    // 相位速率 = 实际速度 / 混合步幅（步幅 = 自然速度 × 周期）
    let stride = 0; const ws = [w0, w1, w2];
    for (let i = 0; i < 3; i++) if (A[i] && ws[i] > 0) stride += ws[i] * G[i].vk * hy * A[i].getClip().duration;
    stride = Math.max(stride, 0.2);
    const minS = 0.32 * W; // 撞墙/被挡住时：保持很慢的步子，不冻结
    let lo = 0, hi = 0; for (let i = 0; i < 3; i++) if (A[i] && ws[i] > 0) { const d = A[i].getClip().duration; lo += ws[i] * G[i].lo / d; hi += ws[i] * G[i].hi / d; }
    const want = Math.max(s, L.want > 0 ? minS : 0) / stride;
    const rate = want < 1e-3 ? 0 : clamp(want, lo, hi); L.rate = rate;
    L.phase = (L.phase + rate * dt) % 1;
    for (let i = 0; i < 3; i++) { const a = A[i]; if (!a) continue; const d = a.getClip().duration, ph = back ? (1 - L.phase) : L.phase;
      a.time = ((ph + G[i].off) % 1) * d; a.setEffectiveWeight(ws[i] * L.mw); }
  }
  // 转身：角速度弹簧（foe.js 原来是固定角速度线性逼近）
  function turn(fo, turnTo, dt, spd) {
    const s = fo.f && fo.f._L ? fo.f._L.s : Math.abs(spd || 0);
    let yv = fo.yawV || 0;
    if (turnTo == null) yv *= Math.exp(-10 * dt);
    else {
      const d = ang(turnTo - fo.yaw), maxR = (5.2 - 2.9 * clamp(s / 4.5, 0, 1)) * (0.85 + 0.3 * (fo.iq || 0.5));
      const want = clamp(d * 7, -maxR, maxR), acc = 26 * dt; yv += clamp(want - yv, -acc, acc);
      if (Math.abs(d) < 0.02 && Math.abs(yv) < 0.3) yv = d / Math.max(dt, 1e-3) * 0.5;
    }
    fo.yawV = yv; fo.yaw = ang(fo.yaw + yv * dt);
  }
  // 起步/刹车加速度上限（返回 true = 已处理）
  function accel(fo, fv, vx, vz, dt, burst) {
    if (fo.atk) return false;
    const dx = vx - fv.x, dz = vz - fv.z, dl = Math.hypot(dx, dz); if (dl < 1e-5) return true;
    const speedUp = Math.hypot(vx, vz) > Math.hypot(fv.x, fv.z);
    const a = (burst ? 16 : speedUp ? 7 : 10) * dt, k = Math.min(1, a / dl);
    fv.x += dx * k; fv.z += dz * k; return true;
  }
  return { on, install, tick, turn, accel, G };
})();
