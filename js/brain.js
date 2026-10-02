// R55f MOD foe_brain 战斗总导演（用户：“战斗 AI 还是非常弱智，莫名其妙乱走不打主角，莫名其妙卡住不动”）
// 病因（实测，tools/test/aibench.js）：敌人行为由十几层各自独立运算——foe.js 基础追击 / FoeAI2 技能 / FoeMind 读招 / FoeRoles 1-3 职业 / Feel54 读招闪避 / Persona / Locomo / Stance …
//   每层都可以在同一帧里起手攻击、写 fo.rv、播动画，互相不知道对方做了什么：
//   ① AI2 层起手攻击后返回 null，职业层紧接着又播 Walk_Loop 把攻击动画顶掉 → fo.atk 永不结束 → 敌人站着不动一直卡到天荒地老（已在 foe.js 修）；
//   ② 攻击令牌 = “谁先抢到算谁”，其余人只能乱绕；你挥刀时 FoeMind 还会让她们后撤、横向预判 → 看起来“乱走不打你”；
//   ③ 疗愈者 / 术士 / 陷阱师这类职业在没有同伴或距离不合适时会站着发呆，没有任何兜底。
// 本模块不替换旧层（它们仍负责各自的招式、动画），而是在它们之上加一个统一的“导演”：
//   · 每 0.35 秒从在场的近战敌人里选出【当前进攻者】（距离最近、冷却最短），攻击令牌只给她（粘性，2.5 秒内没出手才换人）；其余人维持包围圈，不再抢令牌；
//   · 进攻间隔：全场超过 3.2 秒没人出手 → 立刻点名最近的人冲上去（不再人人都“等你先动”）；
//   · 看门狗：交战中、距离 > 2.6m、站着不动超过 1.6 秒 → 清掉她身上互相打架的状态（排队连招 / 打完拉开 / 职业走位），并推她朝你走；
//   · 远程/辅助职业超过 9 秒没有任何出手（疗愈者没同伴、术士被卡住…）→ 6 秒内改走近战追击；
//   · FoeMind 的“后撤 / 横向预判 / 打完拉开”在本模块开启时不再触发（它们和导演的站位冲突）。
window.Brain = (() => {
  const on = () => !window.Mods || !Mods.on || Mods.on('foe_brain') !== false;
  const RANGED = new Set(['ranged', 'mage', 'healer', 'bomber', 'netter', 'trapper', 'wispcaller']);
  let CLK = 0, pick = null, pickT0 = 0, nextPick = 0, lastAct = 0, engN = 0, pf = null; const S = new WeakMap();
  const st = fo => { let s = S.get(fo); if (!s) S.set(fo, s = { acting: false, lastActT: CLK, still: 0, lx: fo.pos.x, lz: fo.pos.z, nudge: 0 }); return s; };
  const busy = fo => !!(fo.atk || fo.sk || (fo.stag > 0) || (fo.block > 0) || (fo.gestT > 0) || (fo.rs && (fo.rs.casting > 0 || fo.rs.roll > 0 || fo.rs.lunge > 0 || fo.rs.kneel > 0)));
  const melee = fo => !RANGED.has(fo.role) || fo.freeT > 0;

  function update(dt, ctx) {
    if (!on()) { pick = null; return; }
    CLK += dt; const P = ctx.player.pos, eng = [];
    { const raw = Math.atan2(-Math.sin(ctx.player.yaw), -Math.cos(ctx.player.yaw)); if (pf == null) pf = raw; else { let e = raw - pf; while (e > Math.PI) e -= 2 * Math.PI; while (e < -Math.PI) e += 2 * Math.PI; const m = 0.45 * dt; pf += Math.max(-m, Math.min(m, e)); } }
    for (const fo of Foe.foes) {
      if (!fo || fo.dead || !fo.pos) continue; const s = st(fo);
      if (fo.freeT > 0) fo.freeT -= dt;
      const acting = !!(fo.atk || fo.sk || (fo.rs && fo.rs.casting > 0)); if (acting && !s.acting) { s.lastActT = CLK; lastAct = CLK; } s.acting = acting;
      const dx = P.x - fo.pos.x, dz = P.z - fo.pos.z, d = Math.hypot(dx, dz) || 1e-3;
      const mv = Math.hypot(fo.pos.x - s.lx, fo.pos.z - s.lz) / Math.max(dt, 1e-3); s.lx = fo.pos.x; s.lz = fo.pos.z;
      if (!(fo.seen && fo.state === 'chase' && d < 22)) { s.still = 0; s.lastActT = CLK; continue; }
      eng.push([fo, d, dx, dz]);
      // 看门狗 1：站着不动
      if (!busy(fo) && d > 2.6 && mv < 0.25) s.still += dt; else s.still = Math.max(0, s.still - 2 * dt);
      if (s.still > 1.6 && !(RANGED.has(fo.role) && !(fo.freeT > 0) && d < 11)) { s.still = 0; fo.mnext = null; fo.kiteT = 0; fo.mFollow = false; fo.detour = 0; fo.freeT = 2.5; s.nudge = 0.9; s.dir = Math.random() < 0.5 ? 1 : -1; fo.cd = Math.min(fo.cd, 0.3); }
      if (s.nudge > 0) { s.nudge -= dt; const ux = dx / d, uz = dz / d, w = s.nudge > 0.45 ? 0.55 : 0; fo.rv = { x: ux * 2.8 + -uz * s.dir * 2.2 * w, z: uz * 2.8 + ux * s.dir * 2.2 * w }; }
      // 看门狗 2：远程/辅助长时间没有任何出手
      if (RANGED.has(fo.role) && !(fo.freeT > 0) && CLK - s.lastActT > 9 && !fo.boss) { fo.freeT = 6; s.lastActT = CLK; }
    }
    if (!eng.length) { pick = null; engN = 0; return; }
    engN = eng.filter(e => melee(e[0])).length;
    // 选进攻者
    if (CLK >= nextPick) {
      nextPick = CLK + 0.35; let best = null, bs = 1e9;
      for (const [fo, d] of eng) { if (!melee(fo) || fo.state !== 'chase') continue; const rec = CLK - st(fo).lastActT; const sc = d + Math.max(0, fo.cd) * 2 + (fo.stag > 0 ? 3 : 0) + (fo.atk || fo.sk ? -50 : 0) + (rec < 3.2 ? (3.2 - rec) * 1.6 : 0) - (fo === pick ? 0.6 : 0); /* 刚出过手的人排后面，轮流上 */ if (sc < bs) { bs = sc; best = fo; } }
      if (best !== pick || (pick && CLK - pickT0 > 2.5 && !pick.atk)) { if (best !== pick) pickT0 = CLK; pick = best; }
      if (pick && (pick.atk || pick.sk)) pickT0 = CLK;
    }
    // 进攻间隔：太久没人出手 → 点名
    if (pick && CLK - lastAct > 3.2) { const d = Math.hypot(P.x - pick.pos.x, P.z - pick.pos.z); if (d < 9 && !busy(pick)) { pick.cd = Math.min(pick.cd, 0); pick.mnext = null; pick.kiteT = 0; pick.mFollow = false; pickT0 = CLK; lastAct = CLK - 1.2; } }
  }
  // foe.js tokenOK 调用：同一时间只有进攻者能出手；全场出手间隔 0.7 秒；有霸主或 ≥4 人在场时允许 2 人同时
  function token(fo, since) {
    if (since < 0.7) return false;
    let n = 0, boss = false, cnt = 0; for (const o of Foe.foes) { if (o.dead) continue; cnt++; if (o.boss) boss = true; if (o !== fo && (o.atk || o.sk)) n++; }
    if (n >= (boss || cnt >= 4 || engN >= 3 ? 2 : 1)) return false;
    if (n === 0 && pick && pick !== fo && !pick.dead && CLK - pickT0 < 2.5 && pick.state === 'chase' && !(pick.stag > 0)) return false;
    return true;
  }
  return { on, update, token, get pick() { return pick; }, get pf() { return pf; }, get clk() { return CLK; }, dbg: fo => S.get(fo) };
})();
