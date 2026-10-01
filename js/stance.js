// R51（R41 主管 j）战斗动作两项 MOD（用户：“战斗时左右移动，步行动画却是前后走，太奇怪了；每次战斗姿势都一样，违和、劣质感”）
//
// ① MOD npc_strafe —— 方向性移动（下肢朝移动方向，上身扭回来盯着你）
//   病因：UAL 免费版只有向前的 Walk/Jog/Sprint，没有横移/后退动作；foe.js 包抄/游走时身体朝玩家、横着平移，却播“向前走”→ 像冰面滑行。
//   做法（动作游戏常用的“下半身朝向 + 上半身瞄准”）：mixer 更新之后，
//     胯骨绕世界竖轴转到【实际移动方向】（最多 ±77°，跑得越快允许越小），脊柱→胸→上胸→脖子按 30/30/25/15% 反向扭回同样角度，
//     所以脚是顺着移动方向迈步的，胸口和脸仍然正对目标；移动方向在身后 110° 以外时改为“倒放走路”（后退步），带滞回不抖。
//   locomo.js 只多记一个平滑速度向量 + 后退判定（npc_locomo 关掉时本项不生效，因为步态混合由它负责）。
//
// ② MOD npc_stance —— 每个人自己的战斗架势
//   以前：拿武器的全员 Sword_Idle，空手的全员 Idle_Loop（放松站立），同一帧同一姿势。
//   现在：按身份/性格给每个敌人（种子稳定）一套架势档案：
//     主架势 + 副架势（Sword_Idle / 举盾式 Idle_Shield_Loop（空手时=举拳护架）/ 施法式 Spell_Simple_Idle_Loop / 抱臂 Idle_FoldArms_Loop），
//     对峙中每 4–9 秒可能换一次；播放节奏 0.8–1.25 倍、起始相位随机（不再齐步呼吸）；
//     体态：侧身（刀侧前置）±9–26°、前压（凶）/后仰（谨慎）、歪头。攻击/受击时体态淡出，出手动作不受影响。
//   只替换“战斗对峙时”的 Sword_Idle / Idle_Loop（fo.state==='chase' 且已发现玩家）；巡逻/村民日常照旧。
// foe.js 两处钩子：animate() 末尾 Stance.install(f)；mixer.update 之后 Stance.post(fo, dt)。关 MOD = 原行为。
window.Stance = (() => {
  const onS = () => !!(window.Mods && Mods.on && Mods.on('npc_strafe') && Mods.on('npc_locomo'));
  const onP = () => !!(window.Mods && Mods.on && Mods.on('npc_stance'));
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const ang = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const UP = new THREE.Vector3(0, 1, 0), AX = new THREE.Vector3(), R = new THREE.Vector3(), F = new THREE.Vector3();
  const M3 = new THREE.Matrix3(), Q = new THREE.Quaternion();
  // 绕【世界轴】转一根骨骼（换算到父骨骼空间后左乘）
  // 注意：UAL 重定向并不驱动每根骨（部分体型的 spine/chest 没有动画轨道），mixer 不会每帧覆盖它们 → 偏移会逐帧累积。
  // 所以每根被改过的骨记下“改前/改后”，下一帧若 mixer 没覆盖（仍等于改后值）就先还原成改前值。
  let FR = 0;
  function rotW(b, axisW, a) {
    if (!b || !b.parent || Math.abs(a) < 1e-4) return;
    if (b._stF !== FR) { b._stF = FR; (b._stPre || (b._stPre = new THREE.Quaternion())).copy(b.quaternion); TOUCH.push(b); }
    b.parent.updateWorldMatrix(true, false); const m = b.parent.matrixWorld; M3.setFromMatrix4(m); const det = M3.determinant();
    AX.copy(axisW).applyMatrix3(M3.invert()).normalize(); Q.setFromAxisAngle(AX, det < 0 ? -a : a); b.quaternion.premultiply(Q); b.updateMatrix();
  }
  // 沿脊柱链分配（缺骨就按比例并给其余）
  function spread(B, list, axis, a) {
    let tot = 0; for (const [n, w] of list) if (B[n]) tot += w; if (!tot) return;
    for (const [n, w] of list) if (B[n]) rotW(B[n], axis, a * w / tot);
  }
  const TOUCH = [];
  function restore(f) { const T = f._stT; if (!T) return; for (const b of T) if (b._stPost && b.quaternion.equals(b._stPost)) b.quaternion.copy(b._stPre); T.length = 0; }
  function commit(f) { const T = f._stT || (f._stT = []); for (const b of TOUCH) { (b._stPost || (b._stPost = new THREE.Quaternion())).copy(b.quaternion); T.push(b); } TOUCH.length = 0; }
  const TW = [['spine', 0.3], ['chest', 0.3], ['upperChest', 0.25], ['neck', 0.15]];

  // ---------- 架势档案 ----------
  const CASTER = new Set(['witch', 'hexer', 'courtmage', 'shaman', 'alchemist', 'moonpriest', 'saint', 'covenlady', 'abyssqueen', 'succubus', 'bogwitch', 'druid', 'archangel', 'avatar']);
  const PROUD = new Set(['princess', 'queen', 'lady', 'countess', 'duchess', 'elfprincess', 'general', 'abyssqueen', 'dragonprincess']);
  const FIGHTER = new Set(['knight', 'paladin', 'guard', 'merc', 'wolfwarrior', 'chieftess', 'dragonknight', 'dragonslayer', 'inquisitor', 'smithgirl', 'huntress', 'assassin', 'shadow', 'catthief', 'crossbow', 'ranger', 'archer', 'falconer']);
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function prof(fo) {
    if (fo._stp) return fo._stp;
    const id = fo.h && fo.h.c && fo.h.c.id || '', sd = (fo.h && fo.h.look && fo.h.look.seed) || ((fo.id || 1) * 7919), r = rng(sd ^ 0x5bd1e995);
    const has = n => !!(fo.f && fo.f.clips && fo.f.clips[n]);
    let main, alt;
    if (fo.armed) { main = 'Sword_Idle'; alt = has('Idle_Shield_Loop') && r() < 0.7 ? 'Idle_Shield_Loop' : null; if (r() < 0.3 && alt) { const t = main; main = alt; alt = t; } }
    else if (CASTER.has(id)) { main = 'Spell_Simple_Idle_Loop'; alt = r() < 0.5 ? 'Idle_Shield_Loop' : (PROUD.has(id) ? 'Idle_FoldArms_Loop' : null); }
    else if (PROUD.has(id)) { main = r() < 0.55 ? 'Idle_FoldArms_Loop' : 'Idle_Shield_Loop'; alt = main === 'Idle_FoldArms_Loop' ? 'Idle_Shield_Loop' : 'Idle_FoldArms_Loop'; }
    else if (FIGHTER.has(id)) { main = 'Idle_Shield_Loop'; alt = r() < 0.5 ? 'Sword_Idle' : null; }
    else { const P = ['Idle_Shield_Loop', 'Sword_Idle', 'Idle_Shield_Loop', 'Spell_Simple_Idle_Loop']; main = P[Math.floor(r() * P.length)]; alt = r() < 0.5 ? 'Idle_Shield_Loop' : null; if (alt === main) alt = null; }
    if (!has(main)) main = fo.armed ? 'Sword_Idle' : 'Idle_Loop'; if (alt && !has(alt)) alt = null;
    const bold = FIGHTER.has(id) ? 0.35 + r() * 0.65 : PROUD.has(id) ? 0.1 + r() * 0.4 : r();
    return (fo._stp = {
      main, alt, cur: main, swT: 3 + r() * 6,
      tempo: 0.8 + r() * 0.45,
      blade: (r() < 0.5 ? -1 : 1) * (0.16 + r() * 0.3) * (fo.armed ? 1 : 0.6), // 侧身
      lean: -0.05 + bold * 0.2, // 前压 / 后仰
      tilt: (r() - 0.5) * 0.16, // 歪头
      sw: 0, lastA: null,
    });
  }
  function combat(fo) { return fo && !fo.dead && !fo.rag && fo.state === 'chase' && fo.seen; }

  function install(f) {
    if (f._stI) return; f._stI = 1;
    const prev = f.play;
    f.play = (name, o = {}) => {
      const fo = f._fo;
      if (onP() && fo && !o.once && (name === 'Sword_Idle' || name === 'Idle_Loop') && combat(fo)) {
        const P = prof(fo); const a = prev(P.cur, Object.assign({}, o, { speed: P.tempo }));
        if (a && a !== P.lastA) { P.lastA = a; try { a.time = Math.random() * a.getClip().duration; } catch (e) { } }
        return a;
      }
      return prev(name, o);
    };
  }

  // mixer.update 之后
  function post(fo, dt) {
    const f = fo.f; if (!f || !f.bones) return; f._fo = fo; FR++; restore(f);
    if (fo.dead || fo.rag) return;
    post2(fo, f, dt); commit(f);
  }
  function post2(fo, f, dt) {
    const B = f.bones, L = f._L;
    const yaw = fo.yaw; F.set(Math.sin(yaw), 0, Math.cos(yaw)); R.set(Math.cos(yaw), 0, -Math.sin(yaw));
    // ① 方向性移动
    if (L) {
      let tgt = 0;
      if (onS() && L.active && L.s > 0.2 && L.rel != null) {
        const maxT = 1.35 - 0.6 * smooth(1.5, 5, L.s);
        tgt = clamp(L.bk ? ang(L.rel - Math.PI) : L.rel, -maxT, maxT) * smooth(0.2, 0.6, L.s);
      }
      L.tw = (L.tw || 0) + (tgt - (L.tw || 0)) * (1 - Math.exp(-9 * dt));
      if (Math.abs(L.tw) > 1e-3) { rotW(B.hips, UP, L.tw); spread(B, TW, UP, -L.tw); }
    }
    // ② 架势体态
    if (onP()) {
      const P = fo._stp || (combat(fo) ? prof(fo) : null);
      if (P) {
        const on = combat(fo) && !fo.atk && !(fo.stag > 0) && !(fo.stun > 0);
        P.sw += ((on ? 1 : 0) - P.sw) * (1 - Math.exp(-(on ? 3 : 10) * dt));
        if (on && P.alt) { P.swT -= dt; if (P.swT <= 0) { P.swT = 4 + Math.random() * 5; if (Math.random() < 0.6) P.cur = P.cur === P.main ? P.alt : P.main; } }
        const w = P.sw; if (w > 1e-3) {
          const mv = L && L.active ? 1 - smooth(0.3, 1.2, L.s) * 0.6 : 1; // 移动中侧身减弱
          const b = P.blade * w * mv, le = P.lean * w, ti = P.tilt * w;
          rotW(B.hips, UP, b); rotW(B.chest || B.spine, UP, -b * 0.45); rotW(B.neck, UP, -b * 0.55);
          rotW(B.spine, R, le * 0.5); rotW(B.chest || B.upperChest, R, le * 0.5); rotW(B.neck, R, -le * 0.7);
          if (B.head) { F.set(Math.sin(yaw), 0, Math.cos(yaw)); rotW(B.head, F, ti); }
        }
      }
    }
  }
  return { install, post, prof, onS, onP };
})();
