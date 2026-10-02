// R55g MOD foe_moves 敌人招式库（用户：“敌人攻击动画太少了，就是那些种类”）
// 病因：动作库里真正的攻击动作只有 Sword_Regular_A/B/C、Sword_Attack、Sword_Dash、两套连击、拳 3 种、投掷；
//   而且职业（foe_roles*.js 的 clip()）直接钦定：重甲卫永远 Sword_Attack、刺客永远 Sword_Dash、决斗者 55% 冲刺 + 25% A……看起来就那一两下。
// 做法（不新增任何模型/动画文件）：
//   ① 变体：把已有的长连击动作按“命中时刻”切成片段（Foe.ATK 里 clip + from 起播偏移）：AB / BC / CD（常规连击的前半/后半/末两刀）、重剑起手 / 重剑收尾；
//   ② 连招：把单刀拼成 2~3 连（A→B、B→A、冲刺→A、重击→B、拳 Jab→Jab→Cross……），后手停顿比单刀短 0.12s，仍有预警；
//   ③ 每个职业一份加权招式池（决斗者偏冲刺+连刺、重甲卫偏重劈+重剑、狂战偏连击……），精英才会用多段招；不会连续两次出同一招；距离远偏冲刺、贴脸偏短招。
// foe.js 的 attack() 在职业选招之后调用 Moves.pick；连招在 atkStep 收招时接 fo.cq 队列。关 MOD = 原来的选招。
// R55h：用户“你能网上多找点动作么”——新增 KayKit Character Animations（CC0）近战包（assets/anim_kk.js，由 tools/anim_bake_kk.js 烘成同格式），动作名前缀 KK_：单手劳劈/斜切/横切/刺、跳劳劈、双手劳劈/切/刺/旋转斩、踢腿、拳击。
//   命中时刻、来刀角度用同一套方法在“这具身体的手/脚骨骼”上实测（右手/左手/脚速度峰值，角度 = atan2(-vy, -vx)，和 UAL 已有条目校准）；wsK = 把前摇拉到和 UAL 差不多的反应时间。
window.Moves = (() => {
  const on = () => !window.Mods || !Mods.on || Mods.on('foe_moves') !== false;
  const A = 'Sword_Regular_A', B = 'Sword_Regular_B', C = 'Sword_Regular_C', DASH = 'Sword_Dash', ATT = 'Sword_Attack', RC = 'Sword_Regular_Combo', HC = 'Sword_Heavy_Combo';
  const AB = 'Sword_Combo_AB', BC = 'Sword_Combo_BC', CD = 'Sword_Combo_CD', HO = 'Sword_Heavy_Open', HF = 'Sword_Heavy_Finish';
  // 命中时刻/来刀角度沿用 foe.js ATK 里实测的数值（常规连击 4 刀：0.25/-132、0.73/-23、1.25/-173、1.53/60；重剑 3 刀：0.4/-22、1.83/-19、2.57/73 重）
  const VAR = {
    [AB]: { clip: RC, hits: [[0.25, -132], [0.73, -23]], end: 1.15 },
    [BC]: { clip: RC, from: 0.5, hits: [[0.73, -23], [1.25, -173], [1.53, 60]], end: 2.1 },
    [CD]: { clip: RC, from: 0.95, hits: [[1.25, -173], [1.53, 60]], end: 2.1 },
    [HO]: { clip: HC, hits: [[0.4, -22]], end: 1.0 },
    [HF]: { clip: HC, from: 1.5, hits: [[1.83, -19], [2.57, 73, 'heavy']], end: 3.2 }
  };
  // KayKit（KK_ 前缀）：出手时刻 = 手/脚速度峰值；wsK = (出手帧 / 想要的前摇秒数) / 0.38
  const KP = 'KK_Melee_', wk = (hit, win) => +(hit / win / 0.38).toFixed(2);
  const CH = KP + '1H_Attack_Chop', JC = KP + '1H_Attack_Jump_Chop', SD = KP + '1H_Attack_Slice_Diagonal', SH = KP + '1H_Attack_Slice_Horizontal', ST = KP + '1H_Attack_Stab';
  const C2 = KP + '2H_Attack_Chop', S2 = KP + '2H_Attack_Slice', SP = KP + '2H_Attack_Spin', T2 = KP + '2H_Attack_Stab', KI = KP + 'Unarmed_Attack_Kick', PU = KP + 'Unarmed_Attack_Punch_A';
  Object.assign(VAR, {
    [CH]: { hits: [[0.63, 85]], end: 1.07, wsK: wk(0.63, 0.75) }, [JC]: { hits: [[0.7, 95, 'heavy']], end: 1.33, lunge: 3.2, wsK: wk(0.7, 1.0) },
    [SD]: { hits: [[0.38, 10]], end: 1.0, wsK: wk(0.38, 0.7) }, [SH]: { hits: [[0.23, -12]], end: 1.0, wsK: wk(0.23, 0.6) }, [ST]: { hits: [[0.37, 0, 'thrust']], end: 1.3, wsK: wk(0.37, 0.75) },
    [C2]: { hits: [[0.7, 80, 'heavy']], end: 1.4, wsK: wk(0.7, 1.0) }, [S2]: { hits: [[0.4, 9]], end: 1.0, wsK: wk(0.4, 0.75) },
    [SP]: { hits: [[0.7, 4], [0.85, 177]], end: 1.5, wsK: wk(0.7, 1.0) }, [T2]: { hits: [[0.4, 0, 'thrust']], end: 1.3, wsK: wk(0.4, 0.75) },
    [KI]: { hits: [[0.44, 0, 'thrust']], end: 0.9, wsK: wk(0.44, 0.75) }, [PU]: { hits: [[0.4, 0, 'thrust']], end: 1.1, wsK: wk(0.4, 0.75) }
  });
  const PJ = 'Punch_Jab', PC = 'Punch_Cross', MH = 'Melee_Hook';
  // [权重, 招式 | 连招数组, 'e' = 仅精英/高阶]
  const POOL = {
    gen: [[14, A], [14, B], [12, C], [10, [A, B]], [8, [B, A]], [6, [A, C]], [7, AB], [6, BC], [5, ATT, 'e'], [4, CD, 'e'], [4, RC, 'e'],
      [9, CH], [9, SD], [8, SH], [8, ST], [5, [SD, KI]], [6, [SH, SD]], [4, JC, 'e']],
    duelist: [[26, DASH], [14, A], [14, B], [10, C], [10, [DASH, A]], [8, [A, B]], [8, AB], [6, BC, 'e'], [10, ST], [8, SD], [8, SH], [6, [ST, SD]], [6, [SH, KI]]],
    juggernaut: [[28, ATT], [16, HO], [12, HF, 'e'], [12, C], [8, [ATT, B]], [8, [C, ATT]], [6, B], [14, C2], [10, S2], [8, T2], [6, SP, 'e'], [6, [C2, KI]]],
    brute: [[24, ATT], [12, HO], [10, HF, 'e'], [10, HC, 'e'], [14, C], [8, [ATT, A]], [8, B], [12, C2], [8, JC, 'e'], [8, S2], [6, SP, 'e'], [8, [C2, KI]]],
    berserk: [[16, RC, 'e'], [14, BC], [12, AB], [12, [A, B]], [10, [B, A, C]], [10, CD, 'e'], [8, HF, 'e'], [10, A], [10, SP, 'e'], [8, JC], [10, [SH, SD, KI]], [8, SD]],
    guard: [[22, B], [16, C], [12, ATT], [12, [B, A]], [10, AB], [8, A], [10, ST], [8, S2], [8, [ST, KI]]],
    warcaller: [[16, A], [16, B], [12, C], [10, [A, B]], [10, ATT], [8, AB], [8, BC], [8, CH], [8, SD], [6, JC, 'e']],
    assassin: [[50, DASH], [12, A], [12, B], [10, [DASH, A]], [8, AB], [10, ST], [8, SH], [8, [SD, KI]]],
    skirm: [[24, DASH], [16, A], [16, B], [10, [A, B]], [10, AB], [8, C], [10, ST], [8, SD], [8, [SH, KI]], [6, JC, 'e']],
    boss: [[14, HC], [12, RC], [10, ATT], [10, HF], [10, HO], [10, BC], [8, CD], [8, AB], [8, A], [8, B], [8, C], [8, [ATT, B]], [8, JC], [8, C2], [8, SP], [8, T2], [6, S2], [6, [C2, KI]]],
    bare: [[16, PJ], [16, PC], [16, MH], [14, [PJ, PC]], [12, [MH, PC]], [10, [PC, MH]], [8, [PJ, PJ, PC]], [16, PU], [12, KI], [8, [PU, KI]], [8, [KI, PU]], [10, [PJ, PU]]]
  };
  const ROLE_OK = new Set(['duelist', 'juggernaut', 'brute', 'berserk', 'guard', 'warcaller', 'assassin', 'skirm']);
  const first = e => Array.isArray(e) ? e[0] : e;
  const reg = () => { const T = window.Foe && Foe.ATK; if (!T) return false; for (const k in VAR) T[k] = VAR[k]; return true; };
  const has = (fo, e) => { const cl = fo.f && fo.f.clips; if (!cl) return true; return (Array.isArray(e) ? e : [e]).every(n => cl[(VAR[n] && VAR[n].clip) || n]); };
  reg();
  function pick(fo, d, cur) {
    if (!on() || fo.duel || cur === 'OverhandThrow') return null; if (!reg()) return null;
    const role = fo.role, armed = !!fo.armed;
    if (role && !ROLE_OK.has(role) && armed) return null; // 长枪/双刀/投弹/网/陷阱/唤灵等有自己的招，不动
    const elite = !!(fo.boss || fo.rar >= 3 || fo.iq > 0.95 || (fo.tier | 0) >= 1);
    const pool = !armed ? POOL.bare : fo.boss ? POOL.boss : POOL[role] || POOL.gen;
    let tot = 0; const ws = [];
    for (const [w0, e, flag] of pool) {
      if (!has(fo, e)) { ws.push(0); continue; } // 动作包没加载（比如 KayKit 文件缺失）就不会选到它
      let w = w0; if (flag === 'e' && !elite) w *= 0.15;
      const c0 = first(e), multi = Array.isArray(e) || (VAR[e] && VAR[e].hits.length > 1) || e === RC || e === HC;
      if (multi && !elite && fo.iq < 0.6) w *= 0.5;
      if (c0 === fo._lastMove) w *= 0.2; // 不连续出同一招
      if (c0 === DASH) w *= d > 2.6 ? 2.5 : d < 1.5 ? 0.25 : 1;
      else if (c0 === ATT || c0 === HO || c0 === HF || c0 === HC) w *= d > 2.8 ? 0.4 : 1;
      if (cur && cur === c0 && role && ROLE_OK.has(role)) w *= 1.3; // 职业原本的偏好仍占一点优势
      ws.push(w); tot += w;
    }
    let r = Math.random() * tot, k = 0; while (k < ws.length - 1 && (r -= ws[k]) > 0) k++;
    const e = pool[k][1], c0 = first(e); fo._lastMove = c0;
    fo.cq = Array.isArray(e) && e.length > 1 && (fo.iq > 0.45 || elite) ? e.slice(1) : null;
    return c0;
  }
  return { on, pick, VAR, POOL };
})();
