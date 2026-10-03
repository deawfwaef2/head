// R71 DLC「首级余兴」—— 8 个小游戏的剧本与文案（引擎见 js/headplay.js）。
// 写法：HeadPlay.reg({ id, ic, n, sub, d, need(建筑 type 或 null), heads, buff, col, setup(Z), update?(Z,dt,t), *script(Z) })
//   script 里 yield 秒数＝等待；yield 提示对象（Z.ring/Z.rings/Z.choice/Z.pick/Z.seqIn）＝等玩家，返回结果。
//   文案占位：{n} 名字 {id} 身份 {race} 种族 {age} {loc} 出身地 {wpn} 武器 {act} 日常 {goal} 遗愿 {tr} 性格 {belief} 信仰。
// 内容边界（与全项目一致）：只用成年首级；黑色幽默 / 讽刺，不写性化内容、不写求饶；头不会说话——台词都是格罗克替她们“配音”。
(() => {
  const HP = window.HeadPlay; if (!HP) return;
  const pk = a => a[Math.floor(Math.random() * a.length) % a.length], fmt = HP.fmt, shuf = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const OG = '格罗克', OGC = '#a6d46e', SN = '斯尼克', SNC = '#e6c86a';
  const og = (Z, t, x) => Z.say(fmt(t, x || Z.x[0]), OG, OGC), nar = (Z, t, x) => Z.say(fmt(t, x || Z.x[0])), sn = (Z, t, x) => Z.say(fmt(t, x || Z.x[0]), SN, SNC);
  const voice = (Z, i, t, x) => { const hd = Z.hd[i]; Z.talk(i, 1.8); Z.say(fmt(t, x || hd.x), `${hd.x.n}（格罗克代配）`, '#ffb4cc'); };
  const rd = (Z, t) => Math.max(1.6, Math.min(5.5, 0.9 + String(t).length * 0.085)); // 一行字的阅读时间
  function* line(Z, fn, t, x, extra) { fn(Z, t, x); yield rd(Z, fmt(t, x || Z.x[0])) + (extra || 0); }
  function* voiceL(Z, i, t, x) { voice(Z, i, t, x); yield rd(Z, fmt(t, x || Z.hd[i].x)); }
  const V = (Z, x, y, z) => new Z.V3(x, y, z);
  const face = (i, o) => { const s = Object.assign({ t: `h${i}.face`, az: 0.25, el: 0.12, d: 0.5, fov: 32 }, o || {}); s.d = Math.max(s.d, 0.46 + (32 - s.fov) * 0.015); return s; }; // 特写下限：整张脸入画（太近只剩一只眼 / 断颈）
  const SAD = { sad: 0.7, angry: 0.25 }, GRUDGE = { angry: 0.55, sad: 0.45 }, SHOCK = { surprised: 0.7, oh: 0.35 }, SMUG = { happy: 0.25, relaxed: 0.35 }, DIZZY = { surprised: 0.3, aa: 0.25 };
  const SINGER = /bard|singer|choir|nun|novice|saint|moonpriest|foxmiko|musician|abbess|priest/, FAITH = /nun|novice|saint|abbess|priest|inquisitor|foxmiko/, THIEF = /catthief|merc|crossbow/, NOBLE = /countess|elfprincess|queen|lady|princess|abbess|covenlady|saint/, ARMS = /knight|paladin|guard|merc|crossbow|wolfwarrior|chieftess|dragonknight|archer|ranger|huntress|inquisitor/, MAGE = /witch|alchemist|hexer|bogwitch|covenlady|druid|shaman|moonpriest|courtmage/, FOLK = /villager|shepherd|barmaid|herbalist|smithgirl|falconer/;

  // ===================================================================== ① 颅之圆舞 · 人头杂耍（无需建筑）
  const JUG = { L: [-0.24, 0.15, 0.36], R: [0.24, 0.15, 0.36] };
  HP.reg({
    id: 'juggle', ic: '🤹', n: '颅之圆舞', sub: '人头杂耍', need: null, heads: 3, buff: 'catch', col: '#ffb86a', tag: '三颗头，两只手，一个不怕晕的食人魔', roles: ['主演', '搭档', '搭档'],
    d: '三颗头在空中轮转，左手 F、右手 J 交替接住，越抛越快；稳稳接住的花式要按住。',
    setup(Z) { Z.Z.jg = { on: false, bt: [], miss: 0, apex: [0, 0, 0], drop: false }; Z.hd.forEach((h, i) => Z.rest(i, -0.3 + i * 0.3, -0.05, 0)); },
    update(Z, dt, t) {
      const J = Z.Z.jg; if (!J.on) return; const bt = J.bt, n = bt.length;
      for (let j = 0; j < 3; j++) {
        const hd = Z.hd[j]; let k0 = -1; for (let k = j; k < n; k += 3) { if (bt[k] <= t) k0 = k; else break; }
        let p, spin = 0;
        if (J.drop) { const u = Math.min(1, (t - J.dropT) / 0.7), x0 = hd.dp || (hd.dp = hd.P.clone()); p = V(Z, x0.x + (j - 1) * 0.12 * u, Math.max(hd.H * 0.5, x0.y - 2.2 * u * u), x0.z - 0.25 * u); }
        else if (k0 < 0) { const L = (j % 2) ? JUG.R : JUG.L, u = Math.min(1, (t - J.t0) / 0.6); p = V(Z, Z.lerp(-0.3 + j * 0.3, L[0], u), Z.lerp(hd.H * 0.5, L[1], u), Z.lerp(-0.05, L[2], u)); }
        else if (k0 + 3 >= n) { const L = (k0 % 2) ? JUG.R : JUG.L; p = V(Z, L[0], L[1], L[2]); }
        else { const A = (k0 % 2) ? JUG.R : JUG.L, B = ((k0 + 3) % 2) ? JUG.R : JUG.L, u = (t - bt[k0]) / (bt[k0 + 3] - bt[k0]), hi = 0.52 + (J.high && J.high[k0] ? 0.28 : 0); p = V(Z, Z.lerp(A[0], B[0], u), Z.lerp(A[1], B[1], u) + 4 * hi * u * (1 - u), Z.lerp(A[2], B[2], u) - 0.25 * Math.sin(Math.PI * u)); spin = u; J.apex[j] = Math.abs(u - 0.5) < 0.12 ? 1 : 0; }
        Z.direct(j, true); hd.P.copy(p); hd.q.setFromEuler(new THREE.Euler(spin * Math.PI * 2 * (j === 1 ? -1 : 1), 0.25 * Math.sin(Math.PI * spin), 0.3 * Math.sin(t * 3 + j), 'YXZ'));
        Z.sway(j, Math.sin(t * 9 + j) * 0.04, 0.02, Math.cos(t * 7 + j) * 0.03);
      }
    },
    *script(Z) {
      const J = Z.Z.jg, X = Z.x; Z.seat(46); Z.cut({ pos: true, t: 'stage', az: 0, el: 0.05, d: 1.25, fov: 46 }); Z.keys('<b>F</b> 左手接　<b>J</b> 右手接　<b>Esc</b> 喊卡');
      Z.meter('接住 <b>0</b>', 0);
      yield* line(Z, og, pk(['「女士们，先生们——还有斯尼克。」三颗头被托在掌心，像三只刚出炉的面包。', '格罗克活动了一下手腕：「今晚的节目，叫《颅之圆舞》。」', '「看好了，斯尼克。这就叫——艺术。」']));
      yield* line(Z, sn, pk(['「老大，这次别再砸到我了……」', '「上次那颗头落在我的汤里！」', '「我押你撑不过二十下。」']));
      for (let j = 0; j < 3; j++) { Z.cut(face(j, { az: [-0.5, 0, 0.5][j], el: 0.1, d: 0.33 })); Z.ex(j, { surprised: 0.25, sad: 0.35 }); yield* line(Z, og, ['「第一位：{ri}，{n}！生前{act}——今天她负责飞。」', '「第二位：{n}！{tr}的{id}，生前{act}。」', '「压轴：{n}！她发过誓要{goal}——今天先学会在空中翻身。」'][j], X[j]); }
      // 节拍：36 下，越来越快；每第 8 下是“稳接”（按住）
      const N = 36, t0 = Z.t + 1.0; let tb = t0 + 0.6; J.bt = []; J.high = {}; for (let k = 0; k < N; k++) { const b = Z.lerp(0.62, 0.33, Math.min(1, k / 30)); J.bt.push(tb); tb += b; if (k % 8 === 7) J.high[k - 3] = 1; } J.t0 = t0; J.on = true; Z.seat(46); Z.cut({ pos: true, t: () => V(Z, 0, 0.38, 0.14), az: 0, el: 0.12, d: 1.15, fov: 50 });
      for (let j = 0; j < 3; j++) { Z.ex(j, DIZZY); Z.roll(j, 0.3, -0.2); }
      const R = []; for (let k = 0; k < N; k++) { const L = (k % 2) ? JUG.R : JUG.L, hold = !!J.high[k - 3]; R.push(Z.ring({ key: (k % 2) ? 'KeyJ' : 'KeyF', at: J.bt[k] - Z.t, lead: 0.85, kind: hold ? 'hold' : 'tap', hold: 0.35, a: V(Z, L[0], L[1], L[2]), tag: hold ? '稳接' : '', silent: false, on: (q) => { if (q === 'miss') { J.miss++; Z.snd('drop'); Z.shake(0.6); } else { Z.snd('catch'); if (hold) Z.sparks(V(Z, L[0], L[1] + 0.05, L[2]), 14, '#ffd27a'); } } })); }
      let next = 0, shots = 0, last = -1;
      while (R.some(r => !r.done) && J.miss < 3) {
        const done = R.filter(r => r.done), c = done.filter(r => r.result !== 'miss').length; Z.meter(`接住 <b>${c}</b> / ${N}`, c / N, J.miss ? `失手 ${J.miss}/3` : '');
        if (Z.t > next) { next = Z.t + Z.pk([2.2, 2.6, 3]); const j = J.apex.indexOf(1) >= 0 ? J.apex.indexOf(1) : (shots % 3); shots++;
          if (shots % 2) { Z.cut({ t: `h${j}.center`, az: Z.pk([-0.6, 0.4, 0.9]), el: Z.pk([-0.1, 0.25]), d: 0.78, fov: 34, dur: 2 }); if (j !== last) { last = j; const x = X[j]; Z.say(fmt(Z.pk(['{n}生前最远只走到过{loc}。现在她每秒横跨一次你的桌子。', '{id}的头转得比她的{wpn}还溜。', '她发过誓要{goal}——至少她现在确实“升”起来了。', '{n}的眼神在空中打转——{tr}的人，最受不了被当成球。', '{n}的头发甩出一道弧。{belief}要是看见了，大概会把这算作神迹。', '斯尼克：「她在瞪你！」格罗克：「每一圈都在瞪，这叫互动。」']), x)); } }
          else Z.cut({ pos: true, t: () => V(Z, 0, 0.4, 0.14), az: Z.pk([-0.35, 0.35]), el: 0.15, d: 1.12, fov: 50, dur: 2 }); }
        yield 0.05;
      }
      R.forEach(r => { if (!r.done) { r.done = true; r.result = 'miss'; r.v = 0; } }); R.forEach(r => Z.score(r.v || 0));
      const c = R.filter(r => r.result !== 'miss').length; Z.stat(`接住 <b>${c}</b> / ${N} · 完美 <b>${R.filter(r => r.result === 'perfect').length}</b>`);
      if (J.miss >= 3) { J.drop = true; J.dropT = Z.t; Z.snd('drop'); Z.seat(46); yield 0.8; Z.snd('drop'); yield* line(Z, nar, '三颗头先后砸在桌上，滚作一团。斯尼克笑到打嗝。'); for (let j = 0; j < 3; j++) Z.ex(j, GRUDGE); }
      else { J.on = false; for (let j = 0; j < 3; j++) { Z.direct(j, false); Z.rest(j, -0.3 + j * 0.3, 0.02, 0, 5); Z.roll(j, 0, 0); Z.ex(j, SAD); } Z.seat(40); yield 1.0; }
      const g = Z.grade(); Z.endLine(g === 'S' ? '最后一颗头稳稳落进掌心，脸正好朝着观众。斯尼克站起来鼓掌，鼓到手都红了。' : g === 'A' || g === 'B' ? '你把三颗头依次摆回桌上。她们的头发乱成一团，表情出奇地一致：不甘。' : '表演结束。桌上的三颗头歪七扭八，其中一颗的眼睛正对着你——像在说「就这？」');
      yield* line(Z, sn, g === 'S' || g === 'A' ? '「我收回那句二十下！老大你是天才！」' : '「……我就说吧。」');
    }
  });

  // ===================================================================== ② 谁吞了魂珠 · 三颅藏珠（无需建筑）
  const SX = [-0.27, 0, 0.27];
  HP.reg({
    id: 'shell', ic: '🫢', n: '谁吞了魂珠', sub: '三颅藏珠', need: null, heads: 3, buff: 'eye', col: '#8fe6ff', tag: '盯紧那颗发光的珠子——她们的嘴比你想的更严', roles: ['一号嘉宾', '二号嘉宾', '三号嘉宾'],
    d: '魂珠滚进其中一颗头的嘴里，三颗头在桌上来回换位；按 1 / 2 / 3 指认是谁吞了它。一共 4 轮，越来越快。',
    setup(Z) { const S = Z.Z.sh = { slot: [0, 1, 2], sw: null }; Z.hd.forEach((h, i) => Z.rest(i, SX[i], 0, 0)); const m = Z.prop(new THREE.SphereGeometry(0.016, 16, 12), new THREE.MeshStandardMaterial({ color: '#cfefff', emissive: '#7ad8ff', emissiveIntensity: 1.6, roughness: 0.2 })); m.visible = false; S.pearl = m; S.glow = Z.glowS('#8fe6ff', 0.09); S.glow.s.visible = false; },
    update(Z, dt, t) {
      const S = Z.Z.sh; if (S.sw) { const w = S.sw, u = Math.min(1, (t - w.t0) / w.d), e = Z.sm(u); for (const [h, a, b, side] of w.mv) { const hd = Z.hd[h]; Z.direct(h, true); hd.P.set(Z.lerp(SX[a], SX[b], e), hd.H * 0.5 + 0.004 + Math.sin(Math.PI * u) * 0.03, Math.sin(Math.PI * e) * 0.13 * side); hd.q.setFromEuler(new THREE.Euler(0, Math.sin(Math.PI * u) * 0.5 * side, Math.sin(Math.PI * u) * 0.25 * side, 'YXZ')); } if (u >= 1) { for (const [h] of w.mv) Z.direct(h, false); w.mv.forEach(([h, a, b]) => Z.rest(h, SX[b], 0, 0, 30)); S.sw = null; } }
      if (S.follow != null && S.pearl.visible) { Z.wA(Z.hd[S.follow], 'mouth', S.pearl.position); S.glow.s.position.copy(S.pearl.position); }
    },
    *script(Z) {
      const S = Z.Z.sh, X = Z.x; Z.seat(40); Z.keys('看清楚 · 指认时按 <b>1</b> <b>2</b> <b>3</b>（从左到右）'); Z.meter('猜中 <b>0</b> / 4', 0);
      yield* line(Z, og, '格罗克把三颗头在桌上排成一排：「欢迎收看——《谁吞了魂珠》！今晚的三位嘉宾——」');
      for (let i = 0; i < 3; i++) { Z.cut(face(i, { az: 0.15, el: 0.08, d: 0.3, fov: 30 })); const x = X[i];
        yield* line(Z, og, THIEF.test(x.idk) ? '「{k}号嘉宾：{n}！生前是{id}——藏东西是她的老本行。」' : FAITH.test(x.idk) ? '「{k}号嘉宾：{n}！{id}，发过誓保守告解室里的每一个秘密——今晚也请继续保密。」' : NOBLE.test(x.idk) ? '「{k}号嘉宾：{n}！高贵的{id}，生前从不张嘴吃东西以外的任何东西——今晚破个例。」' : '「{k}号嘉宾：{ri}{n}！生前{act}，嘴严得很。」', Object.assign({ k: i + 1 }, x)); }
      let hit = 0; const SW = [3, 5, 7, 10], DU = [0.6, 0.46, 0.35, 0.26];
      for (let r = 0; r < 4; r++) {
        Z.seat(40); const own = Z.pk([0, 1, 2]); S.slot.forEach((h, s) => Z.rest(h, SX[s], 0, 0, 14)); yield 0.6;
        S.pearl.visible = true; S.glow.s.visible = true; S.follow = null; const mouth = Z.wA(Z.hd[own], 'mouth', new Z.V3()); const p0 = V(Z, 0, 0.45, 0.12);
        Z.cut(face(own, { az: 0.2, el: 0.25, d: 0.42, fov: 34, dur: 1.4 })); Z.ex(own, { aa: 0.85, oh: 0.3 }, true); Z.snd('pop');
        for (let u = 0; u <= 1.001; u += 0.05) { S.pearl.position.lerpVectors(p0, mouth, Z.sm(u)); S.pearl.position.y += Math.sin(Math.PI * u) * 0.12; S.glow.s.position.copy(S.pearl.position); yield 0.03; }
        S.follow = own; yield 0.25; Z.ex(own, SMUG); S.pearl.visible = false; S.glow.s.material.opacity = 0.25; Z.snd('tick');
        if (r === 0) yield* line(Z, nar, '魂珠滚进了{n}的嘴里。舌根后面透出一点幽蓝的光——她把它含住了，就像生前守着某个秘密。', X[own]);
        S.glow.s.visible = r < 2; Z.cut({ pos: true, t: 'stage', az: 0, el: 0.55, d: 0.95, fov: 44 }); Z.hd.forEach((h, i) => { Z.ex(i, DIZZY, true); Z.roll(i, 0.2, -0.2); });
        yield* line(Z, og, ['「洗牌——！」', '「再快点——！」', '「眼睛别眨！」', '「最后一轮！看好了！」'][r]);
        for (let s = 0; s < SW[r]; s++) { let a = Z.pk([0, 1, 2]), b = Z.pk([0, 1, 2].filter(v => v !== a)); const ha = S.slot[a], hb = S.slot[b]; S.slot[a] = hb; S.slot[b] = ha; S.sw = { t0: Z.t, d: DU[r], mv: [[ha, a, b, 1], [hb, b, a, -1]] }; Z.snd('swish'); if (s % 3 === 1) Z.cut({ pos: true, t: 'stage', az: Z.pk([-0.5, 0.5]), el: 0.3, d: 0.75, fov: 44, dur: 2 }); yield DU[r] + 0.05; }
        Z.seat(40); S.glow.s.visible = false; Z.hd.forEach((h, i) => { Z.roll(i, 0, 0); Z.ex(i, SAD); }); yield 0.4;
        const P = yield Z.pick({ n: 3, map: S.slot.slice(), title: '魂珠在谁嘴里？（1 / 2 / 3，从左到右）', time: 7, noName: false });
        const ch = P.h, ok = ch === own; Z.cut(face(ch, { az: 0.1, el: 0.12, d: 0.28, fov: 28, dur: 2 })); Z.ex(ch, { aa: 0.8, oh: 0.4 }, true); Z.snd('tick'); yield 0.6;
        if (ok) { hit++; S.pearl.visible = true; S.glow.s.visible = true; Z.sparks(Z.wA(Z.hd[ch], 'mouth', new Z.V3()), 26, '#8fe6ff'); Z.snd('good'); Z.pop('猜中！', '#8fe6ff'); Z.score(P.late ? 0.6 : 1, 1); yield* line(Z, og, pk(['「答对了！」格罗克捏开{n}的下巴，魂珠滚了出来，带着一丝不甘的热度。', '「漂亮！」魂珠在{n}的舌头上滚了半圈——她含了这么久，还是没能藏住。']), X[ch]); }
        else { Z.score(0, 1); Z.snd('bad'); Z.pop('猜错', '#ff8a7a'); Z.ex(ch, SAD); yield* line(Z, nar, '你掰开{n}的嘴——空的。她的嘴角好像动了一下。', X[ch]); Z.cut(face(own, { az: -0.2, el: 0.15, d: 0.3, fov: 28 })); Z.ex(own, { aa: 0.7, happy: 0.2 }, true); S.pearl.visible = true; S.glow.s.visible = true; yield* line(Z, nar, pk(['旁边的{n}嘴里，魂珠正幽幽地亮着。这是她这辈子第一次赢了你。', '真正吞着魂珠的是{n}。她的眼神里有一种你没见过的东西——得意。']), X[own]); }
        S.pearl.visible = false; S.glow.s.visible = false; S.follow = null; Z.hd.forEach((h, i) => Z.ex(i, SAD)); Z.meter(`猜中 <b>${hit}</b> / 4`, hit / 4);
      }
      Z.stat(`猜中 <b>${hit}</b> / 4 轮`); const g = Z.grade();
      Z.endLine(hit >= 4 ? '四轮全中。三颗头在桌上排得整整齐齐，再也藏不住任何东西——包括她们的不甘。' : hit >= 2 ? '你赢了几轮，也输了几轮。她们藏珠子的本事，比生前藏住自己的命强一点。' : '你几乎全猜错了。三颗头安静地看着你，第一次显得比你聪明。');
      yield* line(Z, sn, hit >= 3 ? '「老大，你这眼神去当赌徒都够了！」' : '「我觉得她们在偷偷笑你。」');
    }
  });

  // ===================================================================== ③ 我来替你实现 · 遗愿清单（无需建筑，1 颗头）
  const WISH = [
    { re: /报仇|宿敌|斩杀|杀光|打败|格罗克/, st: ['找到仇人', '复仇', '庆功'], acts: [
      [{ t: '递给她一面镜子', d: '你把镜子立在她面前。仇人？镜子里只有一颗头，和一个举着镜子的食人魔。她的视线在两者之间游移，最后停在了你身上。', v: 1, fx: 'glare' }, { t: '念出仇人的名字', d: '你清了清嗓子，念出了自己的名字：「格罗克。」她的眼皮跳了一下——也许只是你的手在抖。', v: 0.7, fx: 'glare' }, { t: '讲一个关于复仇的笑话', d: '你讲了一个关于复仇的笑话。她没有笑。斯尼克也没有笑。洞里安静得能听见血滴下来的声音。', v: 0.3 }],
      [{ t: '让她咬你一口', d: '你把手指伸到她嘴边，掰开下巴，再轻轻合上。牙齿碰到了你的指节——这是她这辈子离复仇最近的一次。', v: 1, fx: 'bite' }, { t: '替她挥一刀', d: '你托着她的头，用她的额头在空中劈了一下，嘴里配音：「喝！」风声里还有一点她的发香。', v: 0.7, fx: 'spin' }, { t: '给她立一块复仇纪念碑', d: '你在她面前摆了块小石头，刻着「复仇成功（大概）」。她盯着石头，像盯着一个侮辱。', v: 0.4 }],
      [{ t: '为她举杯', d: '你举起一杯麦酒，倒进她嘴里。酒从断面淌了出来，在桌上积成一小滩。「干杯，复仇者。」', v: 1, fx: 'tilt' }, { t: '放一首凯歌', d: '斯尼克吹起口哨。跑调的凯歌在洞里回荡，像是为她，又像是为你。', v: 0.65 }, { t: '宣布仇人已死', d: '你宣布：「你的仇人已经死了。」停顿。「——在你的梦里。」', v: 0.35 }]] },
    { re: /妹|母亲|父亲|家族|嫁妆|婚约|心上人|私奔/, st: ['团聚', '履约', '回家'], acts: [
      [{ t: '给她找个“亲人”', d: '你从架子上取下另一颗头，摆在她旁边：「看，一家人。」两颗头的额头碰在一起，发出很轻的一声。', v: 1, fx: 'nudge' }, { t: '替她写一封家书', d: '你替她写：「家里一切都好吗？我很好，就是有点轻。」落款是她的名字，字是你的。', v: 0.75 }, { t: '在地图上标出她的家', d: '你在地图上{loc}的位置画了个叉。她的眼睛对着那个叉，像对着一扇关上的门。', v: 0.35 }],
      [{ t: '用魂晶给她凑嫁妆', d: '你往她嘴里塞了三颗魂晶：「嫁妆，攒够了。」魂晶在她舌头上叮当作响——就是没人来娶。', v: 1, fx: 'cry' }, { t: '替她解除婚约', d: '你在婚约书上按了个血手印：「解除。」她终于自由了——自由到连脖子都不需要了。', v: 0.8 }, { t: '替她还债', d: '你在债主名单上写下「已偿还：一颗头」。斯尼克：「这个汇率不太对吧？」', v: 0.5 }],
      [{ t: '给她盖条小毯子', d: '你用一块旧布把她裹起来，只露出一张脸。温暖、安全，像她小时候。只是布下面什么都没有。', v: 1, fx: 'sad' }, { t: '为她唱摇篮曲', d: '你哼起一首摇篮曲。食人魔的嗓音让洞顶落下几粒灰。她的眼睛半闭着——本来就半闭着。', v: 0.7 }, { t: '把她放在洞口等家人', d: '你把她摆在洞口，脸朝外：「等吧，他们会来接你的。」风吹乱了她的头发。没有人来。', v: 0.45 }]] },
    { re: /第一|传奇|英雄|记住|名字|证明|冒险者|剑士/, st: ['夺冠', '成名', '刻碑'], acts: [
      [{ t: '举办一场比武', d: '你把她摆在桌子正中：「王国第一剑士大赛，参赛者：一名。」她以绝对优势夺冠——对手连头都没有。', v: 1, fx: 'cry' }, { t: '给她颁一枚勋章', d: '你把一枚生锈的扣子按在她额头上：「传奇。」扣子掉了。你又按了一次。', v: 0.7 }, { t: '替她写传记', d: '你写下第一句：「她生于{loc}，死于格罗克。」然后发现写完了。', v: 0.4 }],
      [{ t: '让所有首级向她低头', d: '你挨个按下架子上其他首级的额头，让她们朝她低头。她终于被所有人仰望——虽然大家都只剩一颗头。', v: 1, fx: 'nudge' }, { t: '把她挂在洞口当招牌', d: '你在洞口钉了个钩子。路过的人第一眼就会看见她——这就叫名扬天下。', v: 0.75 }, { t: '大声念她的名字一百遍', d: '「{n}！{n}！{n}！」念到第三十遍，斯尼克捂着耳朵逃走了。名字在洞里回荡，越来越不像一个名字。', v: 0.45 }],
      [{ t: '在她额头刻上名字', d: '你用指甲在她额头写下「{n}」，又在下面补了一行：「格罗克所有」。名字刻上了——只是碑就是她自己。', v: 1, fx: 'glare' }, { t: '把名字刻进英雄碑', d: '你在一块墓碑上刻了她的名字，然后把碑当成了砧板。', v: 0.6 }, { t: '让斯尼克记住她', d: '斯尼克认真地点头：「记住了，那个……那个谁。」', v: 0.35 }]] },
    { re: /魔法|魔导|研究|揭穿|诗集|记忆|药方|圣杯|写/, st: ['入门', '施展', '传世'], acts: [
      [{ t: '让她亲身研究死灵学', d: '你宣布：「恭喜，你现在是死灵学最好的标本。」她盯着天花板，像在思考一个永远没有答案的课题。', v: 1, fx: 'glow' }, { t: '给她一本书', d: '你把书立在她面前，隔一会儿替她翻一页。她读得很慢——永远停在第一页。', v: 0.7 }, { t: '授予她学位', d: '你把一顶纸帽扣在她头上：「大魔导师。」帽子太大，盖住了她的眼睛。', v: 0.45 }],
      [{ t: '用她的头念咒', d: '你托着她的下巴一开一合：「阿——布——拉——」什么也没发生。斯尼克：「老大，咒语需要肺。」', v: 1, fx: 'talk' }, { t: '让她写诗', d: '你把一支笔塞进她嘴里，在纸上拖出一条歪歪扭扭的线：「一首诗。题目叫《头》。」', v: 0.75, fx: 'tilt' }, { t: '揭穿一个谎言', d: '你郑重宣布一个惊天秘密：「你已经死了。」她看起来并不惊讶。', v: 0.45 }],
      [{ t: '把她的“著作”供上书架', d: '你把她摆上书架，夹在两本书中间：「流传后世。」她的头发垂下来，像一枚书签。', v: 1, fx: 'tilt' }, { t: '办一场学术报告会', d: '听众：斯尼克，和一只老鼠。报告人：一言不发。掌声：零。', v: 0.6 }, { t: '在她面前烧掉禁书', d: '书页在火里卷曲，火光在她的瞳孔里跳动。她的眼神里第一次有了点什么——你不确定那是不是愤怒。', v: 0.5, fx: 'glare' }]] },
    { re: /大海|圣山|之巅|蝴蝶|花园|房子|龙/, st: ['启程', '抵达', '纪念'], acts: [
      [{ t: '带她去“看海”', d: '你把她的脸按进一桶盐水里：「看，大海。」一个气泡都没冒——她早就不需要呼吸了。', v: 1, fx: 'dunk' }, { t: '带她“登顶”', d: '你把她放在洞里最高的那块石头上：「山顶到了。」她的视线越过整个洞穴，看见的是你的后脑勺。', v: 0.8, fx: 'tilt' }, { t: '给她讲讲海的样子', d: '你描述了海：「很大，很湿，咸的。」你自己也没见过海。', v: 0.35 }],
      [{ t: '送她一只“蝴蝶”', d: '一只飞蛾落在她的睫毛上，翅膀一开一合。你没有赶它走——这是她收集到的最后一只。', v: 1, fx: 'sad' }, { t: '给她盖一座“房子”', d: '你用三块砖把她围起来，门口插一朵枯花：「带花园的房子。」她住进去了，再也不用付租金。', v: 0.85 }, { t: '让她驯服一头“龙”', d: '你把一只蜥蜴放到她面前。蜥蜴爬过她的鼻梁，在她眼窝里停了一会儿。驯服失败。', v: 0.45 }],
      [{ t: '为她画一幅风景', d: '你在她身后的墙上画了一道波浪线：「海。」又画了一个三角形：「山。」她背对着这一切，永远看不见。', v: 1, fx: 'spin' }, { t: '寄一张明信片', d: '明信片上写着：「到此一游。——{n}的头」你把它寄回了{loc}。', v: 0.7 }, { t: '承诺下次带她去', d: '「下次，」你说，「下次一定。」你们都知道没有下次。', v: 0.45 }]] },
    { re: /赎|罪|守护|村子|活到|瘟疫|教会/, st: ['告解', '守护', '功德'], acts: [
      [{ t: '替她赎罪', d: '你在她面前跪下，又嫌这姿势太累站了起来：「赦免。」{belief}没有反对——大概是没听见。', v: 1 }, { t: '听她告解', d: '你把耳朵凑到她嘴边，听了很久，郑重地点头：「我原谅你。」她什么也没说过。', v: 0.75, fx: 'talk' }, { t: '让她守护洞口', d: '你把她摆在洞口当门卫。她守护的不再是她的村子，而是吃掉她村子的人。', v: 0.5 }],
      [{ t: '帮她“活到一百岁”', d: '你在她面前点了一百根蜡烛。烛光晃了一夜，她的年龄停在了{age}岁，蜡烛却一根根燃尽了。', v: 1, fx: 'glow' }, { t: '为她的村子祈福', d: '你朝{loc}的方向拜了拜：「保佑那里……下次多出几颗好头。」', v: 0.8 }, { t: '让她见证奇迹', d: '你变了个戏法：用布盖住她，掀开——还是她的头。奇迹没有发生。', v: 0.4 }],
      [{ t: '为她立一块功德碑', d: '碑文：「守护者{n}，守护了一切，除了自己的脖子。」', v: 1 }, { t: '给她戴上圣徽', d: '你把一枚圣徽挂在她耳朵上。圣徽歪着，像她最后的信仰。', v: 0.65 }, { t: '宣布她的罪已赎清', d: '「你的罪已赎清。」你又补了一句：「我的还没有。」', v: 0.45 }]] },
    { re: /统治|女王|王国|酒馆/, st: ['加冕', '临朝', '退位'], acts: [
      [{ t: '给她加冕', d: '你用一圈铁丝在她头顶扎了个王冠：「女王陛下。」铁丝勒进头发，她的表情庄严得像在忍痛。', v: 1, fx: 'glare' }, { t: '让她坐上王座', d: '你把她摆在你的椅子上。王座太大，她只占了一个角——她统治的版图正好一颗头那么大。', v: 0.8 }, { t: '给她开一家酒馆', d: '你在她面前摆两个杯子和一块招牌：「{n}的酒馆」。客人：斯尼克。斯尼克没付钱。', v: 0.6 }],
      [{ t: '让臣民朝拜', d: '你让架子上的首级全都转向她。她的臣民一言不发，忠诚得无可挑剔。', v: 1, fx: 'nudge' }, { t: '替她颁布第一道法令', d: '你宣读：「女王令：从今天起，人人都必须有头。」你顿了一下：「女王本人的身体除外。」', v: 0.75 }, { t: '举办加冕舞会', d: '斯尼克抱着扫帚跳了一支舞。舞会冷清得像葬礼——其实也差不多。', v: 0.45 }],
      [{ t: '让她签署退位诏书', d: '你把笔塞进她嘴里，在诏书上划了一道：「签好了。」她的统治持续了四十秒。', v: 1, fx: 'tilt' }, { t: '为她铸一枚硬币', d: '硬币正面是她的侧脸，背面是你的手。', v: 0.7, fx: 'cry' }, { t: '高呼王国万岁', d: '「王国万岁！」洞里的回声问：「哪个王国？」', v: 0.4 }]] }
  ];
  const WISH0 = { st: ['宣读', '实现', '归档'], acts: [
    [{ t: '郑重地宣读她的愿望', d: '你把「{goal}」念了三遍，一遍比一遍严肃。念到第三遍，你自己先笑了。', v: 0.8 }, { t: '假装出门替她办', d: '你出门绕了一圈，回来宣布：「办好了。」她信了——她别无选择。', v: 1 }, { t: '把纸条吃掉', d: '你把纸条塞进嘴里嚼了嚼：「愿望，已消化。」', v: 0.5 }],
    [{ t: '用她的头比个胜利手势', d: '你托着她的头转了一圈，替她宣布：「我做到了！」她的表情说明她并不这么认为。', v: 1, fx: 'spin' }, { t: '给她发一张证书', d: '证书上写着「已完成：{goal}」。你把它贴在她额头上，像一张符。', v: 0.7 }, { t: '让斯尼克替她鼓掌', d: '斯尼克鼓了两下掌，停下来问：「为什么鼓掌？」', v: 0.4 }],
    [{ t: '把她和纸条一起供起来', d: '你把纸条压在她下巴底下，摆上架子最显眼的位置。愿望和许愿的人终于在一起了。', v: 1 }, { t: '在纸条背面写下你的愿望', d: '你写：「再来一颗。」', v: 0.75 }, { t: '把纸条折成纸船', d: '纸船顺着洞里的水沟漂走了。她目送它离开——用眼角。', v: 0.5 }]] };
  HP.reg({
    id: 'wish', ic: '📜', n: '我来替你实现', sub: '遗愿清单', need: null, heads: 1, buff: 'mock', col: '#ffd27a', tag: '她生前最想做的事——你用自己的方式替她完成', reveal: ['name', 'race', 'goal'],
    d: '翻出她的遗愿，分三步“替她实现”：每步三选一（1/2/3），再按空格卡准笑点。最后按住空格盖上「已实现」的章。',
    setup(Z) { Z.rest(0, 0, 0.02, 0); },
    *script(Z) {
      const x = Z.x[0], B = WISH.find(b => b.re.test(x.goal)) || WISH0; Z.cut(face(0, { az: 0.1, el: 0.05, d: 0.42, fov: 34 })); Z.ex(0, { sad: 0.55, surprised: 0.2 }); Z.keys('<b>1</b> <b>2</b> <b>3</b> 选择　<b>空格</b> 卡笑点'); Z.meter('喝彩', 0);
      yield* line(Z, nar, '你从她的发髻里抖出一张折得很小的纸条。纸被血浸软了，字却写得很用力——');
      Z.banner(`「${x.goal}」`, `${x.n} 的遗愿`, Z.gm.col, 2.6); Z.snd('sting'); yield 2.4;
      yield* line(Z, og, pk(['「好。」格罗克把纸条拍在桌上，「这个愿望，我替你实现。」', '「放心，」格罗克拍了拍她的脸，「我办事，你放心。」', '「真巧，」格罗克咧开嘴，「我今天正好有空。」']));
      Z.ex(0, { sad: 0.4, surprised: 0.4 }); let tot = 0;
      for (let a = 0; a < 3; a++) {
        Z.cut({ t: 'h0.chin', az: [0.35, -0.4, 0.1][a], el: [0.1, 0.2, -0.05][a], d: 0.55, fov: 32 }); Z.pop(`第 ${a + 1} 步 · ${B.st[a]}`, Z.gm.col);
        const opts = shuf(B.acts[a]).map(o => ({ t: o.t, d: '', v: o.v, o }));
        const C = yield Z.choice({ title: `第 ${a + 1} 步：${B.st[a]}——怎么替她办？`, opts, time: 10 });
        const o = C.x.o; Z.cut(face(0, { az: Z.pk([-0.5, 0.5, 0]), el: Z.pk([0.25, -0.15]), d: 0.4, fov: 30, dr: { d: -0.06 } }));
        fx(Z, o.fx); yield* line(Z, nar, o.d, x, 0.2);
        const R = yield Z.ring({ key: 'Space', at: 1.1, lead: 1.0, a: 'h0.face', tag: '笑点！' }); const sc = C.v * (0.45 + 0.55 * (Z.Z.rings.length ? 1 : 1) * ({ perfect: 1, great: 0.85, ok: 0.6, miss: 0.25 }[R] || 0.25)); Z.score(sc, 1); tot += sc;
        if (sc > 0.75) { Z.snd('cheer'); yield* line(Z, sn, pk(['「哈哈哈哈！她那表情！」', '「老大你太坏了！再来！」', '「我要把这个讲给全洞的老鼠听！」'])); } else if (sc > 0.45) { yield* line(Z, sn, pk(['「嗯……还行。」', '「我笑了，但只笑了一点点。」'])); } else { Z.snd('boo'); yield* line(Z, sn, pk(['「……冷场了老大。」', '「她都比你有幽默感。」'])); }
        Z.meter('喝彩', tot / (a + 1)); Z.ex(0, a === 2 ? GRUDGE : { sad: 0.5, angry: 0.2 + a * 0.15 });
      }
      Z.cut(face(0, { az: 0, el: 0.02, d: 0.3, fov: 28, dr: { d: -0.06 } })); yield* line(Z, og, '「最后一步——」格罗克举起一枚沾着红泥的印章。');
      const R2 = yield Z.ring({ key: 'Space', at: 1.2, lead: 1.1, kind: 'hold', hold: 0.6, a: 'h0.face', tag: '按住盖章' }); Z.score({ perfect: 1, great: 0.85, ok: 0.6, miss: 0.2 }[R2] || 0.2, 1);
      Z.snd('gavel'); Z.flash('#fff', 0.5); Z.shake(1); Z.banner('✓ 已实现', `「${x.goal}」`, '#ff6a5a', 2.2); Z.ex(0, GRUDGE); Z.roll(0, 0.15, 0.15); yield 2.2;
      Z.endLine(fmt(pk(['她的遗愿清单上，第一行被划掉了。笔迹是你的。', '{n}的遗愿是「{goal}」。你替她做到了——用一种她这辈子都不会原谅的方式。', '愿望实现了。{n}的眉心皱着，像是还有很多话想说。可惜她只剩一颗头，而头不会说话。']), x));
    }
  });
  function fx(Z, k) {
    if (!k) return; const P = Z.hd[0].Pt.clone();
    if (k === 'glare') { Z.ex(0, { angry: 0.7, sad: 0.2 }); Z.roll(0, -0.1, -0.1); }
    else if (k === 'bite') { Z.ex(0, { aa: 0.9 }, true); setTimeout(() => { try { Z.ex(0, { angry: 0.5 }); Z.snd('thud'); Z.shake(0.5); } catch (e) { } }, 700); }
    else if (k === 'spin') { [0, 1, 2, 3].forEach(s => setTimeout(() => { try { Z.at(0, [P.x, P.y + (s < 3 ? 0.08 : 0), P.z], s < 3 ? [0.2, (s + 1) * 2.1, 0.3] : [0, 0, 0], 8); } catch (e) { } }, s * 380)); }
    else if (k === 'tilt') { Z.at(0, [P.x, P.y, P.z], [-0.55, 0.2, 0.35], 4); Z.ex(0, { sad: 0.5, aa: 0.4 }); }
    else if (k === 'dunk') { Z.at(0, [P.x, P.y - 0.2, P.z + 0.05], [0.6, 0, 0], 4); setTimeout(() => { try { Z.at(0, [P.x, P.y, P.z], [0, 0, 0], 5); Z.sparks(Z.wA(Z.hd[0], 'face', new Z.V3()), 30, '#9fd8ff', 0.7); Z.ex(0, { surprised: 0.3, sad: 0.6 }); } catch (e) { } }, 1500); }
    else if (k === 'cry') { Z.ex(0, { aa: 0.7 }, true); Z.crystals(Z.wA(Z.hd[0], 'mouth', new Z.V3()), 18, false); Z.snd('crystal'); }
    else if (k === 'nudge') { Z.at(0, [P.x - 0.03, P.y, P.z], [0, 0.35, 0.2], 6); Z.ex(0, { sad: 0.6 }); }
    else if (k === 'glow') { Z.glow(1.6); setTimeout(() => { try { Z.glow(0); } catch (e) { } }, 1800); }
    else if (k === 'talk') Z.talk(0, 2);
    else if (k === 'sad') { Z.ex(0, { sad: 0.9, blink: 0.4 }); }
  }

  // ===================================================================== ⑨ 滚颅保龄 · 全中之夜（无需建筑，4 颗头）——赢的那颗挨个嘲笑倒下的
  const BW = { pins: [[0, -0.17], [-0.17, -0.33], [0.17, -0.33]], start: [0, 0.4], R: 0.2 }, BWQ = new THREE.Quaternion(), BWA = new THREE.Vector3();
  function pinLine(x) { const id = x.idk; return ARMS.test(id) ? '「瓶：{n}，{id}。站岗是她的老本行——今天看她还站不站得住。」' : NOBLE.test(id) ? '「瓶：{n}，高贵的{id}。生前从不低头——今天不用低，直接倒。」' : FAITH.test(id) ? '「瓶：{n}，{id}。她跪了一辈子，今天终于能躺下了。」' : FOLK.test(id) ? '「瓶：{n}，{id}。她这辈子被人推来推去——今天也一样。」' : '「瓶：{n}，{tr}的{ri}。站好别动——反正你也动不了。」'; }
  function bwKnock(Z, B, i, nx, nz, v) {
    B.down[i] = 1; const hd = Z.hd[i], s = 0.7 + Math.min(2, v) * 0.55; Z.direct(i, true);
    B.fly.push({ i, vx: nx * s, vz: nz * s, vy: 0.8 + Math.random() * 0.6, w: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), ws: 7 + Math.random() * 7, rest: false });
    Z.snd('thud'); Z.snd('catch'); Z.shake(0.55); Z.ex(i, { surprised: 0.85, oh: 0.5 }, true); Z.sparks(hd.P.clone().add(new THREE.Vector3(0, 0.06, 0)), 12, '#ffd0d0', 0.6);
    if (!B.slowT) { B.slow = 0.28; B.slowT = Z.t + 1.1; }
  }
  HP.reg({
    id: 'bowl', ic: '🎳', n: '滚颅保龄', sub: '全中之夜', need: null, heads: 4, buff: 'strike', col: '#7fd0ff', tag: '她滚过去的时候，另外三颗头只能看着她过来', roles: ['球', '瓶', '瓶', '瓶'], reveal: ['name', 'race', 'goal'],
    d: '她当球，另外三颗当瓶，打两局。先按空格卡准瞄准线（越准越正），再按住空格蓄力出手——正中第一颗，连锁撞倒后两颗就是全中。赢的那颗会挨个嘲笑倒下的。',
    setup(Z) {
      const B = Z.Z.bw = { roll: null, fly: [], slow: 1, slowT: 0, down: [0, 0, 0, 0], aim: 0, aimOn: false };
      Z.rest(0, BW.start[0], BW.start[1], 0); BW.pins.forEach((p, i) => Z.rest(i + 1, p[0], p[1], 0));
      const ar = Z.prop(new THREE.BoxGeometry(0.014, 0.004, 0.42).translate(0, 0, -0.21), { color: '#7fd0ff', emissive: '#3a90c0', emissiveIntensity: 0.9 }); ar.visible = false; ar.castShadow = false; B.arrow = ar;
    },
    update(Z, dt, t) {
      const B = Z.Z.bw; if (!B) return; if (B.slowT && t > B.slowT) { B.slow = 1; B.slowT = 0; } const k = dt * B.slow;
      if (B.aimOn) { B.aim = 0.35 * Math.sin(B.om * (t - B.aimT0)); const P = Z.hd[0].P; B.arrow.visible = true; B.arrow.position.set(P.x, 0.006, P.z - 0.12); B.arrow.rotation.y = -B.aim; } else B.arrow.visible = false;
      const R = B.roll; if (R && !R.done) { const hd = Z.hd[0], P = hd.P;
        if (!R.fall && !B.appr) { for (let i = 1; i < 4; i++) { if (B.down[i]) continue; const q = Z.hd[i].P; if (Math.hypot(q.x - P.x, q.z - P.z) < BW.R + 0.13) { B.appr = Z.t; B.slow = 0.3; B.slowT = t + 1.3; for (let j = 1; j < 4; j++) Z.ex(j, SHOCK, true); break; } } }
        if (!R.fall) { R.v = Math.max(0, R.v - 0.3 * k); P.x += R.dx * R.v * k; P.z += R.dz * R.v * k; hd.q.premultiply(BWQ.setFromAxisAngle(BWA.set(R.dz, 0, -R.dx), R.v * k / 0.13));
          for (let i = 1; i < 4; i++) { if (B.down[i]) continue; const q = Z.hd[i].P, dx = q.x - P.x, dz = q.z - P.z, dd = Math.hypot(dx, dz) || 1e-3; if (dd < BW.R) { const nx = dx / dd, nz = dz / dd; bwKnock(Z, B, i, nx, nz, R.v); const vn = R.dx * nx + R.dz * nz; R.dx -= 0.6 * vn * nx; R.dz -= 0.6 * vn * nz; const l = Math.hypot(R.dx, R.dz) || 1; R.dx /= l; R.dz /= l; R.v *= 0.68; } }
          if (Math.abs(P.x) > 0.72 || P.z < -0.45) { R.fall = true; R.vy = 0; Z.snd('whoosh'); } else if (R.v < 0.03) R.done = true; }
        else { R.vy -= 9.8 * k; P.y += R.vy * k; P.x += R.dx * R.v * 0.5 * k; P.z += R.dz * R.v * 0.5 * k; if (P.y < -0.78 + hd.H * 0.4) { P.y = -0.78 + hd.H * 0.4; R.done = true; Z.snd('drop'); } } }
      for (const f of B.fly) { if (f.rest) continue; const hd = Z.hd[f.i], P = hd.P;
        f.vy -= 9.8 * k; P.x += f.vx * k; P.y += f.vy * k; P.z += f.vz * k; hd.q.premultiply(BWQ.setFromAxisAngle(f.w, f.ws * k));
        const onT = Math.abs(P.x) < 0.73 && P.z > -0.46 && P.z < 0.46, fy = (onT ? 0 : -0.78) + hd.H * 0.38;
        if (P.y < fy && f.vy < 0 && (onT || P.y < fy)) { P.y = fy; f.vy *= -0.3; f.vx *= 0.55; f.vz *= 0.55; f.ws *= 0.45; if (Math.abs(f.vy) < 0.3) f.rest = true; else Z.snd('thud'); }
        for (let j = 1; j < 4; j++) { if (B.down[j] || j === f.i) continue; const q = Z.hd[j].P, dx = q.x - P.x, dz = q.z - P.z, dd = Math.hypot(dx, dz) || 1e-3; if (dd < BW.R && P.y < q.y + 0.12) { const sp = Math.hypot(f.vx, f.vz); bwKnock(Z, B, j, dx / dd, dz / dd, sp * 0.9); f.vx *= 0.45; f.vz *= 0.45; } } }
    },
    *script(Z) {
      const B = Z.Z.bw, X = Z.x, ball = X[0]; Z.keys('<b>空格</b> 卡准瞄准线　→　<b>按住空格</b> 蓄力出手'); Z.meter('撞倒 <b>0</b> / 6', 0); let tot = 0, strikes = 0;
      Z.cut({ t: () => V(Z, 0, 0.12, -0.05), az: 1.15, el: 0.35, d: 1.4, fov: 40, dr: { az: -0.25 } });
      yield* line(Z, og, '格罗克把桌子清空：「今晚打保龄。」三颗头在桌子那头站成一个三角——站得比她们生前任何时候都直。');
      Z.cut(face(0, { az: 0.3, el: 0.15 })); yield* line(Z, og, '「球——{n}！」{ri}，她想{goal}。今天她要滚得比这辈子走过的路都快。', ball);
      for (let i = 1; i < 4; i++) { Z.cut(face(i, { az: [0.2, -0.3, 0.35][i - 1], el: 0.15 })); Z.ex(i, { surprised: 0.35, sad: 0.45 }); yield* line(Z, og, pinLine(X[i]), X[i]); }
      for (let r = 0; r < 2; r++) {
        if (r) { B.fly = []; B.roll = null; for (let i = 0; i < 4; i++) { Z.direct(i, false); Z.hd[i].snap = true; Z.roll(i, 0, 0); } B.down = [0, 0, 0, 0]; Z.rest(0, BW.start[0], BW.start[1], Math.PI); BW.pins.forEach((p, i) => Z.rest(i + 1, p[0], p[1], 0)); Z.hd.forEach((h, i) => Z.ex(i, i ? SAD : GRUDGE)); Z.banner('第二局', '重新摆瓶', Z.gm.col, 1.4); yield* line(Z, nar, '你把三颗头捡回来，重新摆好。她们的头发乱了，眼神也乱了。'); }
        Z.cut({ t: () => V(Z, 0, 0.08, -0.12), az: 0, el: 0.34, d: 1.0, fov: 42 }); Z.ex(0, { angry: 0.4, sad: 0.4 }); if (!r) { Z.rest(0, BW.start[0], BW.start[1], Math.PI, 5); yield 0.6; }
        B.om = r ? 2.8 : 2.2; B.aimT0 = Z.t; B.aimOn = true; B.aimLock = null; Z.say(r ? '第二球。瞄准线晃得更快了。' : '蓝色的瞄准线在桌面上来回摇摆——在它正对中间那一刻按空格。');
        const A = yield Z.ring({ key: 'Space', at: 2 * Math.PI / B.om, lead: 1.0, a: () => V(Z, 0, 0.02, -0.02), tag: '瞄准中线', on: () => { B.aimLock = B.aim; } });
        const aim = A === 'miss' || B.aimLock == null ? (Math.random() < 0.5 ? -1 : 1) * (0.22 + Math.random() * 0.12) : B.aimLock; B.aimOn = false; B.arrow.visible = true; B.arrow.rotation.y = -aim; Z.score({ perfect: 1, great: 0.8, ok: 0.5, miss: 0 }[A] || 0, 1);
        const Pw = yield Z.ring({ key: 'Space', at: 0.9, lead: 0.8, kind: 'hold', hold: 0.6, a: 'h0.center', tag: '按住蓄力' }); const v0 = { perfect: 1.45, great: 1.3, ok: 1.1, miss: 0.85 }[Pw] || 0.85; Z.score({ perfect: 1, great: 0.8, ok: 0.5, miss: 0.1 }[Pw] || 0.1, 1);
        B.arrow.visible = false; B.appr = 0; Z.direct(0, true); B.roll = { dx: Math.sin(aim), dz: -Math.cos(aim), v: v0 }; Z.snd('whoosh'); Z.ex(0, DIZZY); Z.roll(0, 0.4, -0.3); Z.say(fmt(pk(['{n}滚了出去——头发一圈圈缠在脸上。', '她在桌面上翻滚，每转一圈，都有一次正对着那三颗头。', '{n}滚得歪歪扭扭，像她生前走过的每一条路。']), ball));
        Z.cut({ t: 'h0.center', az: 0.85, el: 0.3, d: 0.9, fov: 40 }); let cp = false; const tEnd = Z.t + 8;
        while (Z.t < tEnd && !(B.roll.done && B.fly.every(f => f.rest))) { if (!cp && (B.appr || B.roll.done)) { cp = true; Z.cut({ t: () => V(Z, 0, 0.12, -0.26), az: Z.pk([0.4, -0.4]), el: 0.16, d: 0.8, fov: 38, dr: { d: 0.15 } }); } yield 0.05; }
        yield 0.5; const down = [1, 2, 3].filter(i => B.down[i]), up = [1, 2, 3].filter(i => !B.down[i]), n = down.length; tot += n; Z.score(n / 3, 2.5); Z.meter(`撞倒 <b>${tot}</b> / 6`, tot / 6);
        if (n === 3) { strikes++; Z.banner('全 中！', 'STRIKE', Z.gm.col, 2); Z.snd('cheer'); Z.snd('fan'); Z.crystals(V(Z, 0, 0.3, -0.3), 26, true, '#7fd0ff'); yield 1.6; }
        else if (!n) { Z.snd('boo'); yield* line(Z, sn, B.roll.fall ? '「洗沟球！她直接滚到地上去了！」' : '「一个都没倒？老大，她们是不是在用力站着？」'); }
        else Z.pop(`撞倒 ${n}`, Z.gm.col);
        const P0 = Z.hd[0].P; Z.cut({ t: 'h0.center', az: Z.pk([-0.5, 0.5]), el: 0.35, d: 0.62, fov: 36 }); Z.ex(0, SMUG); Z.roll(0, -0.2, 0.25);
        if (n) { const v = Z.x[Z.pk(down)], ctx = { pn: v.n, pgoal: v.goal, pact: v.act, ptr: v.tr };
          yield* voiceL(Z, 0, pk(['「{pn}，你不是想{pgoal}吗？躺着也算吗？」', '「{pn}，听说你生前{pact}——现在连站都站不住了。」', '「别瞪我，{pn}。要怪就怪你站在那儿——就像你一辈子都站错了地方。」', '「{pn}，你的{ptr}呢？倒下的时候怎么没带上？」']), ctx); Z.ex(down[0], GRUDGE); }
        if (up.length) { const j = up[0], s = X[j]; Z.cut(face(j, { az: 0.2, el: 0.12 })); Z.ex(j, SMUG); yield* voiceL(Z, j, pk(['「就这？{bn}，你想{bgoal}？你连我都撞不倒。」', '「{bn}，滚得不错。可惜方向跟你这辈子一样——歪的。」']), { bn: ball.n, bgoal: ball.goal }); Z.ex(0, GRUDGE); if (P0.y < 0) yield* line(Z, nar, '{n}躺在桌子底下，脸朝着地面。没人去捡她。', ball); }
      }
      Z.stat(`撞倒 <b>${tot}</b> / 6 · 全中 <b>${strikes}</b> 次`);
      Z.endLine(fmt(strikes === 2 ? '两局全中。{n}被你从桌子那头捡回来时，嘴角居然挂着一点得意——这是她这辈子赢得最干脆的一次。' : tot >= 4 ? '桌上东倒西歪地躺着几颗头。{n}滚回你脚边，脸上沾着别人的头发。' : '保龄球之夜草草收场。三颗“瓶”还站着，像在嘲笑这颗不够圆的球。', ball));
    }
  });

  // ===================================================================== ④ 嚎叫图腾 · 串首魂桥（需要「示威矛墙」）
  HP.reg({
    id: 'totem', ic: '🪵', n: '嚎叫图腾', sub: '串首魂桥', need: 'rh_palisade', heads: 3, buff: 'flow', coin: 90, col: '#c78bff', tag: '一根矛，三颗头，一股往上涌的魂', roles: ['底座', '中段', '顶端'],
    d: '矛从断颈穿进、从嘴里穿出，三颗头串成图腾。魂光沿矛往上涌，经过谁就按谁的键（1 底 / 2 中 / 3 顶）把魂“挤”上去；漏太多会爆。',
    setup(Z) {
      const T = Z.Z.tt = { y: [], v: 0.42, pres: 0, pulses: [] }, UP = new THREE.Vector3(0, 1, 0); let y = 0, pTop = 0, pMouth = 0; const yaw = [-0.35, 0.4, -0.1];
      // 矛 = 断颈→嘴 的连线（竖直）：头被放倒成“仰面朝天”，后脑垂在矛的一侧。头按球（半径 = 半个头高）往上叠，不互相穿插。
      //（不用 Box3.setFromObject：VRM 头的蒙皮几何体还带着整身的包围盒，量出来有 3 米高）
      Z.hd.forEach((hd, i) => { const ax = hd.L.mouth.clone().sub(hd.L.cut), len = ax.length(); const q = new THREE.Quaternion().setFromUnitVectors(ax.normalize(), UP).premultiply(new THREE.Quaternion().setFromAxisAngle(UP, yaw[i]));
        const c = hd.L.center.clone().sub(hd.L.cut).applyQuaternion(q), r = hd.H * 0.47, lo = c.y - r, hi = c.y + r;
        y = i === 0 ? 0.03 - lo : Math.max(pMouth + 0.03, pTop - lo - 0.02);
        hd.Pt.set(0, y, 0).add(c); hd.qt.copy(q); hd.snap = true; T.y.push(y + len * 0.5); pTop = y + hi; pMouth = y + len; });
      T.top = pMouth + 0.035; const st = Z.prop(new THREE.CylinderGeometry(0.009, 0.013, T.top + 0.32, 10), { color: '#3a2a20', roughness: 0.6, metalness: 0.2 }); st.position.set(0, (T.top + 0.32) / 2 - 0.04, 0);
      const tip = Z.prop(new THREE.ConeGeometry(0.022, 0.1, 8), { color: '#8a8a90', roughness: 0.35, metalness: 0.8 }); tip.position.set(0, T.top + 0.33, 0);
      Z.hd.forEach((h, i) => { Z.ex(i, { aa: 0.75, oh: 0.3, sad: 0.4 }, true); Z.roll(i, 0.35, 0.35); });
      T.eyes = Z.hd.map(() => { const g = Z.glowS('#c78bff', 0.05); g.s.material.opacity = 0; return g; });
    },
    update(Z, dt, t) {
      const T = Z.Z.tt; if (!T) return;
      for (const p of T.pulses) { if (p.done) continue; const y = -0.04 + p.v * (t - p.t0); p.g.s.position.set(0, y, 0); p.g.s.material.opacity = 0.9; p.g.s.scale.setScalar(0.07 + 0.02 * Math.sin(t * 20)); if (y > T.top + 0.25) { p.done = true; Z.glowOff(p.g); if (p.ok) { Z.crystals(new THREE.Vector3(0, T.top + 0.3, 0), 10 + 4 * p.ok, false, '#c78bff'); Z.snd('crystal'); } } }
      T.eyes.forEach((g, i) => { Z.wA(Z.hd[i], 'eyes', g.s.position); g.s.material.opacity *= Math.exp(-dt * 5); g.s.visible = g.s.material.opacity > 0.02; });
      Z.hd.forEach((hd, i) => Z.sway(i, Math.sin(t * 6 + i) * 0.015, 0.03, Math.cos(t * 5 + i) * 0.015));
    },
    *script(Z) {
      const T = Z.Z.tt, X = Z.x; Z.keys('<b>1</b> 底座　<b>2</b> 中段　<b>3</b> 顶端　按住 / 连按看提示'); Z.meter('魂压 <b>0%</b>', 0);
      Z.cut({ t: () => new THREE.Vector3(0, (T.y[1] + T.top) * 0.5, 0), az: 0.25, el: 0.3, d: 1.6, fov: 40, dr: { el: 0.2, d: -0.25 }, dur: 9 });
      yield* line(Z, nar, '示威矛墙上最长的那根矛被你拔了下来。三颗头被你一颗一颗串上去——矛尖从断颈进去，从张开的嘴里出来。');
      yield* line(Z, nar, '她们仰着脸，像三朵朝天开的花。斯尼克给这件作品起了名字：「嚎叫图腾」。');
      const intro = ['底座：{n}（{id}）。生前{act}——现在她托着另外两个人。', '中段：{n}，{tr}的{id}。她夹在中间，像她的一生。', '顶端：{n}。她想{goal}——恭喜，她现在是全洞最高的女人。'];
      for (let i = 0; i < 3; i++) { Z.cut(face(i, { az: [0.3, -0.35, 0.15][i], el: 0.8, d: 0.42, fov: 32 })); yield* line(Z, og, intro[i], X[i]); }
      Z.cut({ t: () => new THREE.Vector3(0, T.y[1], 0), az: 0, el: 0.45, d: 1.4, fov: 42 }); yield* line(Z, og, '「魂从底下往上走。走到谁，就挤谁——挤准了，魂晶从顶上喷出来。」');
      const waves = [{ n: 4, gap: 1.6, v: 0.42 }, { n: 6, gap: 1.05, v: 0.55 }, { n: 5, gap: 1.2, v: 0.5, hold: 1 }, { n: 8, gap: 0.72, v: 0.7 }];
      const all = []; let shotT = 0, lineT = Z.t + 3;
      for (let w = 0; w < waves.length && T.pres < 1; w++) {
        const W = waves[w]; T.v = W.v; Z.pop(['第一股魂', '第二股：快了', '灌注：中段要按住', '魂潮'][w], Z.gm.col);
        for (let k = 0; k < W.n && T.pres < 1; k++) {
          const p = { t0: Z.t, v: T.v, g: Z.glowS('#e0c0ff', 0.07), ok: 0, done: false }; T.pulses.push(p);
          const rs = [0, 1, 2].map(i => Z.ring({ key: 'Digit' + (i + 1), at: (T.y[i] + 0.04) / T.v, lead: 0.8, kind: W.hold && i === 1 ? 'hold' : 'tap', hold: 0.5, a: `h${i}.face`, tag: ['底', '中', '顶'][i], silent: true, on: (q) => { const ok = q !== 'miss'; Z.pop(ok ? (q === 'perfect' ? '挤准了' : '好') : '漏了', ok ? '#e0c0ff' : '#ff6a6a'); if (ok) { p.ok++; T.eyes[i].s.material.opacity = 0.9; Z.talk(i, 0.35); Z.snd('tick'); } else { T.pres = Math.min(1, T.pres + 0.13); Z.sparks(Z.wA(Z.hd[i], 'cut', new THREE.Vector3()), 16, '#b080ff', 0.6); Z.snd('bad'); Z.shake(0.4); } Z.meter(`魂压 <b>${Math.round(T.pres * 100)}%</b>`, T.pres); } }));
          all.push(...rs); const until = Z.t + W.gap;
          while (Z.t < until) { if (Z.t > shotT) { shotT = Z.t + Z.pk([1.6, 2.2]); const i = Z.pk([0, 1, 2]); Z.cut(Z.pk([face(i, { az: Z.pk([-0.4, 0.4]), el: 0.7, d: 0.33, fov: 30, dur: 2 }), { t: () => new THREE.Vector3(0, T.y[1], 0), az: Z.pk([-0.3, 0.3]), el: Z.pk([0.3, 0.55]), d: 1.35, fov: 42, dur: 2 }])); }
            if (Z.t > lineT) { lineT = Z.t + 5.5; const a = Z.pk([0, 1]), x0 = X[a], x1 = X[a + 1]; Z.say(fmt(Z.pk(['魂光从{n0}的嘴里涌出，钻进{n1}的断颈。两颗头生前互不相识，现在共用同一口气。', '{n1}的眼睛被魂光照得发亮——这是她死后第一次“看见”东西。', '{n0}托着别人，就像她生前一直在做的那样。']), { n0: x0.n, n1: x1.n })); }
            yield 0.05; }
        }
        while (all.some(r => !r.done)) yield 0.05;
      }
      while (all.some(r => !r.done)) yield 0.05; all.forEach(r => Z.score(r.v || 0, 1));
      if (T.pres >= 1) { Z.cut(face(1, { az: 0, el: 0.5, d: 0.4, fov: 36 })); Z.hd.forEach((h, i) => { Z.roll(i, 1, 1); Z.ex(i, { aa: 1, surprised: 0.5 }, true); }); Z.snd('sting'); Z.shake(1.2); Z.flash('#b080ff', 0.6); yield* line(Z, nar, '图腾抖了一下，三颗头同时翻起了白眼——魂压爆了。斯尼克被喷了一脸紫光。'); }
      else {
        Z.cut({ t: () => new THREE.Vector3(0, T.top, 0), az: 0, el: 0.4, d: 0.7, fov: 40, dr: { d: -0.1 } }); yield* line(Z, og, '「最后一口——给我喷！」');
        const M = yield Z.ring({ key: 'Space', at: 1.0, lead: 0.9, kind: 'mash', n: 14, hold: 2.2, a: 'h2.face', tag: '狂按空格' }); Z.score({ perfect: 1, great: 0.8, ok: 0.5, miss: 0.15 }[M] || 0.15, 2);
        Z.ex(2, { aa: 1, surprised: 0.6 }, true); Z.roll(2, 0.9, 0.9); for (let i = 0; i < 6; i++) { Z.crystals(new THREE.Vector3(0, T.top + 0.28, 0), 16, true, '#c78bff'); Z.snd('crystal'); yield 0.12; } Z.snd('coins');
        yield* line(Z, nar, '顶端的{n}猛地张大了嘴——魂晶像泉水一样从矛尖喷出来，叮叮当当洒满了桌面。', X[2]);
      }
      const hits = all.filter(r => r.result && r.result !== 'miss').length; Z.stat(`挤准 <b>${hits}</b> / ${all.length} · 魂压 <b>${Math.round(T.pres * 100)}%</b>`);
      Z.endLine(T.pres >= 1 ? '你把三颗头从矛上卸下来。她们的嘴还张着，像是还在叫——只是叫不出声。' : fmt('你把矛插回示威矛墙。三颗头还串在上面，仰着脸，张着嘴。{n}的眼里还残留着一点紫光，像一句没喊完的话。', X[2]));
    }
  });
  window.__HPG1 = 1;

  // ===================================================================== ⑤ 本庭宣判 · 亡者法庭（需要「亡者议会」）
  const JX = [-0.3, 0, 0.3];
  function charges(x) {
    const id = x.idk, a = ARMS.test(id) ? '持械擅闯格罗克的私人狩猎场' : NOBLE.test(id) ? '拒绝向食人魔行礼，且发型过于高傲' : MAGE.test(id) ? '非法炼制让格罗克打喷嚏的药粉' : SINGER.test(id) ? '在格罗克午睡时公然唱歌' : THIEF.test(id) ? '企图盗窃本洞财物（未遂——头先没了）' : FOLK.test(id) ? '长得太像一顿晚饭' : `身为${x.ri}，且住得离洞口太近`;
    return [{ t: a, k: 'id' }, { t: `意图「${x.goal}」罪（未遂）`, k: 'goal' }, { t: `${x.tr}罪（情节恶劣）`, k: 'tr' }];
  }
  function proofs(ch, x, X) {
    const j = X[1 + Math.floor(Math.random() * 3)], best = ch.k === 'id' ? 0 : ch.k === 'goal' ? 2 : 1;
    const o = [{ t: '出示物证', d: `她的${x.wpn}`, d2: `你把一件“物证”拍在桌上——她的${x.wpn}早就丢在战场上了，你拍的是一根树枝。陪审团没有异议。` },
      { t: '传唤证人', d: `陪审员 ${j.n} 出庭`, d2: `你托着${j.n}的下巴替她作证：「是她干的，我亲眼看见了。」${j.n}半睁着眼，看起来确实很像亲眼看见。`, w: j },
      { t: '当庭还原', d: '你亲自演一遍', d2: `你亲自扮演被告：学她${x.fight.slice(0, 14)}……演到一半自己先笑了。斯尼克笑得滚下了凳子。` }];
    o.forEach((v, i) => { v.v = i === best ? 1 : 0.5 + Math.random() * 0.2; }); return shuf(o);
  }
  function defLine(x) { const T = x.traits.join(''); return /毒舌/.test(T) ? '「你们这群没身体的，也配审我？」' : /高傲|傲慢/.test(T) ? '「我是{id}。你们见了我该下跪——哦，你们没有膝盖。」' : /傲娇/.test(T) ? '「才、才不是我干的！……好吧，是我。」' : /狡黠|腹黑/.test(T) ? '「法官大人，我申请更换法官。」' : /虔诚/.test(T) ? '「{belief}会审判你们所有人。」' : /冷酷|冷静/.test(T) ? '「……」（她用沉默表达了一切，主要是因为她没法说话）' : '「我只是想{goal}而已……」'; }
  HP.reg({
    id: 'court', ic: '⚖️', n: '本庭宣判', sub: '亡者法庭', need: 'rh_council', heads: 4, buff: 'verdict', col: '#ff8a7a', tag: '被告已死，陪审团已死，只有法官还活着', roles: ['被告', '陪审员', '陪审员', '陪审员'], reveal: ['name', 'race', 'goal'],
    d: '亡者议会开庭：三项指控各选一种举证（1/2/3）并落槌（空格），陪审团表决时依次按 1/2/3 让她们点头，最后按住空格宣判。',
    setup(Z) { const C = Z.Z.ct = { nod: [0, 0, 0, 0] }; Z.rest(0, 0, 0.12, 0); const box = Z.prop(new THREE.BoxGeometry(0.98, 0.15, 0.25), { color: '#2e1c14', roughness: 0.8 }); box.position.set(0, 0.075, -0.3); for (let j = 1; j < 4; j++) { const hd = Z.hd[j]; Z.at(j, [JX[j - 1], 0.15 + hd.H * 0.5 + 0.004, -0.3], [0, -JX[j - 1] * 0.6, 0]); C['b' + j] = hd.Pt.clone(); } },
    update(Z, dt) { const C = Z.Z.ct; for (let j = 1; j < 4; j++) { if (C.nod[j] > 0) { C.nod[j] = Math.max(0, C.nod[j] - dt * 2.2); const k = Math.sin(Math.PI * Math.min(1, C.nod[j])) * 0.5, b = C['b' + j]; Z.at(j, [b.x, b.y - k * 0.02, b.z + k * 0.02], [k, -JX[j - 1] * 0.6, 0], 30); } } },
    *script(Z) {
      const X = Z.x, d = X[0], C = Z.Z.ct; Z.keys('<b>1</b> <b>2</b> <b>3</b> 选择 / 让陪审员点头　<b>空格</b> 落槌'); Z.meter('定罪 <b>0%</b>', 0); let conv = 0;
      Z.cut({ t: () => new THREE.Vector3(0, 0.2, -0.1), az: 0, el: 0.3, d: 1.2, fov: 42, dr: { d: -0.1 } }); Z.ex(0, { sad: 0.5, surprised: 0.3 });
      Z.snd('gavel'); yield* line(Z, og, '「全体肃静！」格罗克用一根大腿骨敲了敲桌面，「亡者议会——现在开庭！」');
      Z.cut({ t: () => new THREE.Vector3(0, 0.3, -0.3), az: 0.12, el: 0.5, d: 0.85, fov: 40 }); yield* line(Z, nar, '陪审团：{a}、{b}、{c}。她们都已经死了，所以绝对公正。', { a: X[1].n, b: X[2].n, c: X[3].n });
      Z.cut(face(0, { az: 0.05, el: 0.1, d: 0.34, fov: 30 })); yield* line(Z, sn, '「书记官斯尼克宣读：被告，{ri}{n}，{age}岁，籍贯{loc}。」', d);
      const CH = charges(d);
      for (let k = 0; k < 3; k++) {
        Z.cut({ t: 'h0.chin', az: [0.4, -0.35, 0.15][k], el: [0.15, 0.25, -0.05][k], d: 0.62, fov: 34 }); Z.ex(0, { sad: 0.4, angry: 0.15 + k * 0.15 });
        yield* line(Z, og, `「第${k + 1}项指控：${CH[k].t}！」`);
        const P = yield Z.choice({ title: '怎么举证？', opts: proofs(CH[k], d, X), time: 10 }); const o = P.x;
        if (o.w) { const wi = Z.hd.findIndex(h => h.x === o.w); if (wi > 0) { Z.cut(face(wi, { az: 0.2, el: 0.12, d: 0.3, fov: 30 })); Z.talk(wi, 2); } } else Z.cut({ t: 'h0.face', az: Z.pk([-0.6, 0.6]), el: 0.3, d: 0.6, fov: 38 });
        yield* line(Z, nar, o.d2);
        Z.cut(face(0, { az: 0, el: 0.35, d: 0.5, fov: 36 })); const R = yield Z.ring({ key: 'Space', at: 1.0, lead: 0.9, a: 'h0.crown', tag: '落槌！' });
        Z.snd('gavel'); Z.shake(0.7); Z.flash('#fff', 0.18); const s = P.v * ({ perfect: 1, great: 0.85, ok: 0.6, miss: 0.3 }[R] || 0.3); Z.score(s, 1.5); conv += s / 3 * 0.6; Z.meter(`定罪 <b>${Math.round(conv * 100)}%</b>`, conv);
        yield* line(Z, og, s > 0.75 ? pk(['「证据确凿！」', '「铁证如山！」', '「本庭非常满意！」']) : s > 0.45 ? pk(['「……勉强采纳。」', '「证据有点牵强，但本庭不在乎。」']) : pk(['「这证据连斯尼克都不信。」', '「驳回——驳回你自己。」']));
      }
      Z.cut({ t: () => new THREE.Vector3(0, 0.3, -0.3), az: -0.22, el: 0.5, d: 0.92, fov: 42 }); yield* line(Z, og, '「陪审团，请表决！」格罗克挨个按下她们的头——点头，就是有罪。');
      const RS = yield Z.rings([1, 2, 3].map((j, i) => ({ key: 'Digit' + (i + 1), at: 1.1 + i * 0.6, lead: 0.9, a: `h${j}.crown`, tag: X[j].n, on: (q) => { if (q !== 'miss') { C.nod[j] = 1; Z.snd('thud'); } else { Z.ex(j, { blink: 1 }); } } })));
      const yes = RS.filter(r => r !== 'miss').length; RS.forEach(r => Z.score({ perfect: 1, great: 0.85, ok: 0.6, miss: 0 }[r] || 0, 1)); conv += yes / 3 * 0.2; Z.meter(`定罪 <b>${Math.round(conv * 100)}%</b>`, conv);
      yield* line(Z, nar, yes === 3 ? '三票全部有罪。陪审团的头点得整整齐齐，像排练过。' : yes > 0 ? `${yes} 票有罪，其余弃权——有一位陪审员在表决时睡着了。她已经睡了很久了。` : '陪审团一致弃权。她们只是静静地看着被告，像在看自己。');
      Z.cut({ t: 'h0.chin', az: -0.2, el: 0.08, d: 0.6, fov: 32 }); const D = yield Z.choice({ title: '被告要不要辩护？', opts: shuf([{ t: '让她自辩', d: '你替她配音', v: /毒舌|高傲|傲娇|狡黠|冷酷|腹黑|虔诚/.test(d.traits.join('')) ? 1 : 0.6, k: 'self' }, { t: '堵上她的嘴', d: '塞一块抹布', v: 0.75, k: 'gag' }, { t: '替她认罪', d: '「我认罪」', v: 0.85, k: 'plead' }]), time: 10 });
      if (D.x.k === 'self') { yield* voiceL(Z, 0, defLine(d), d); yield* line(Z, og, '「说得好。驳回。」'); }
      else if (D.x.k === 'gag') { Z.ex(0, { angry: 0.7, sad: 0.3 }); yield* line(Z, nar, '你把一块抹布塞进她嘴里。她的眼神比任何辩护都更有说服力——可惜本庭不看眼神。'); }
      else { yield* voiceL(Z, 0, '「我认罪。我不该出生在{loc}，更不该长成{id}。」', d); yield* line(Z, og, '「被告认罪态度良好——从重处罚。」'); }
      Z.score(D.v, 1);
      Z.cut(face(0, { az: 0, el: 0.45, d: 0.5, fov: 34, dr: { d: -0.1 } })); yield* line(Z, og, '「本庭宣判——」格罗克高高举起大腿骨。');
      Z.snd('drum'); const VR = yield Z.ring({ key: 'Space', at: 1.4, lead: 1.2, kind: 'hold', hold: 0.8, a: 'h0.crown', tag: '按住……落槌' }); { const vq = { perfect: 1, great: 0.85, ok: 0.6, miss: 0.2 }[VR] || 0.2; Z.score(vq, 1.5); conv += 0.2 * vq; Z.meter(`定罪 <b>${Math.round(conv * 100)}%</b>`, conv); }
      Z.snd('gavel'); Z.shake(1.4); Z.flash('#fff', 0.45); Z.banner('有 罪', `被告 ${d.n} · ${d.ri}`, '#ff6a5a', 2.2); Z.ex(0, GRUDGE); Z.roll(0, 0.1, 0.1); yield 2.0;
      yield* line(Z, og, pk(['「判决如下：被告{n}，意图{goal}，罪名成立。判处——永久陈列于本洞，每日面壁反省三个时辰。」', '「判处：替本庭实现她的遗愿『{goal}』——由本庭用最省事的方法执行。执行完毕。」', '「判处：头颅与身体永久分居。立即生效——哦，已经生效了。」']), d);
      Z.endLine(fmt(pk(['法槌落下的时候，{n}的眉心皱了一下。也许是你的错觉——也许她直到最后都不服。', '退庭后，陪审团还留在原位，看着被告的空位。被告就在那里，只是不再是被告了。', '本案到此结束。{n}的卷宗被斯尼克拿去垫了桌脚。']), d));
    }
  });

  // ===================================================================== ⑥ 押头 · 断头赌局（需要「命运骰塔」）
  const UPV = new THREE.Vector3(0, 1, 0);
  HP.reg({
    id: 'dice', ic: '🎲', n: '押头', sub: '断头赌局', need: 'rh_dice', heads: 3, buff: 'luck', coin: 60, col: '#9fe8a0', tag: '押一颗头，赌她转回来看你', roles: ['赌桌', '赌桌', '赌桌'],
    d: '三颗头在转盘上脸朝外旋转。押一颗（1/2/3），在转盘减速时按空格喊「停」——喊得越准，越可能是她转回来看你。赢了可以翻倍，也可以收手。',
    setup(Z) { const D = Z.Z.dc = { phi: 0.3, w: 0, stop: null, R: 0.2 }; Z.hd.forEach((h, i) => Z.direct(i, true)); const disc = Z.prop(new THREE.CylinderGeometry(0.37, 0.39, 0.03, 48), { color: '#2a3a24', roughness: 0.8 }); disc.position.set(0, 0.015, -0.02); D.disc = disc; },
    update(Z, dt, t) {
      const D = Z.Z.dc; let w = D.w; if (D.stop) { const s = D.stop, u = Math.min(1, (t - s.t0) / s.d); D.phi = s.a + (s.b - s.a) * (1 - Math.pow(1 - u, 3)); w = 3 * (s.b - s.a) / s.d * Math.pow(1 - u, 2); if (u >= 1) { D.stop = null; D.w = 0; } } else { D.phi += D.w * dt; D.w *= Math.exp(-dt * 0.12); }
      D.disc.rotation.y = D.phi; const sw = Math.min(1, w / 5) * 0.025; Z.hd.forEach((hd, i) => { const th = D.phi + i * Math.PI * 2 / 3; hd.P.set(Math.sin(th) * D.R, 0.03 + hd.H * 0.5 + 0.004, -0.02 + Math.cos(th) * D.R); hd.q.setFromAxisAngle(UPV, th); Z.sway(i, Math.cos(th) * sw, 0, -Math.sin(th) * sw); });
    },
    *script(Z) {
      const X = Z.x, D = Z.Z.dc; Z.keys('<b>1</b> <b>2</b> <b>3</b> 押注 / 选择　<b>空格</b> 喊停'); let lv = 0; const MUL = [1, 2, 4, 8, 16, 32]; Z.meter('筹码 <b>×1</b>', 0);
      Z.cut({ t: () => new THREE.Vector3(0, 0.14, -0.02), az: 0, el: 0.6, d: 1.0, fov: 42 });
      yield* line(Z, nar, '命运骰塔的骰子咔哒咔哒滚下来，停在一个点数上。格罗克笑了：「今晚换个玩法。」');
      yield* line(Z, nar, '三颗头被摆上转盘，脸朝外——像三扇随时会关上的门。');
      for (let i = 0; i < 3; i++) { D.stop = { t0: Z.t, d: 0.9, a: D.phi, b: D.phi + ((-i * Math.PI * 2 / 3 - D.phi) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2) }; yield 1.0; Z.cut(face(i, { az: 0.15, el: 0.1, d: 0.32, fov: 30, dur: 3 })); yield* line(Z, og, ['「庄家一号：{n}，{id}。生前{act}——她赌过最大的一把，是赌你追不上她。」', '「庄家二号：{n}！{tr}的{race}。她的运气，在遇见你那天用完了。」', '「庄家三号：{n}。她想{goal}——今晚，她只想转回来。」'][i], X[i]); }
      for (let r = 0; r < 5; r++) {
        Z.cut({ t: () => new THREE.Vector3(0, 0.14, -0.02), az: 0, el: 0.55, d: 0.95, fov: 42 });
        const B = yield Z.pick({ n: 3, map: [0, 1, 2], title: `第 ${r + 1} 把 · 押谁转回来看你？`, time: 9 }); const bet = B.h;
        D.w = 9 + r * 1.2; Z.snd('drum'); Z.hd.forEach((h, i) => Z.ex(i, DIZZY)); Z.cut({ t: () => new THREE.Vector3(0, 0.14, -0.02), az: Z.pk([-0.4, 0.4]), el: 0.42, d: 1.05, fov: 44, dr: { az: 0.3 } });
        yield* line(Z, nar, pk(['转盘呼呼作响，三张脸轮流从你面前闪过——惊恐、不甘、空白。', '头发甩成了一圈圈的线。你押的{n}每转一圈都看你一眼。']), X[bet]);
        const R = yield Z.ring({ key: 'Space', at: 1.3 + Math.random() * 0.8, lead: 1.0, a: () => new THREE.Vector3(0, 0.25, 0.2), tag: '停！' }); Z.score({ perfect: 1, great: 0.8, ok: 0.5, miss: 0.1 }[R] || 0.1, 1);
        const pw = { perfect: 0.88, great: 0.68, ok: 0.46, miss: 0.22 }[R] || 0.22, win = Math.random() < pw, w = win ? bet : Z.pk([0, 1, 2].filter(i => i !== bet)), wv = Math.max(2.5, D.w); let b = -w * Math.PI * 2 / 3; while (b < D.phi + wv * 0.55) b += Math.PI * 2; const dd = Math.min(3.2, Math.max(1.3, 3 * (b - D.phi) / wv)); D.stop = { t0: Z.t, d: dd, a: D.phi, b }; D.w = 0; Z.snd('drum'); yield dd + 0.15;
        Z.cut({ t: `h${w}.chin`, az: 0, el: 0.1, d: 0.6, fov: 30 }); Z.hd.forEach((h, i) => Z.ex(i, SAD));
        if (win) { lv++; Z.ex(w, SMUG); Z.snd('cheer'); Z.crystals(Z.wA(Z.hd[w], 'face', new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0)), 12 + lv * 6, true, '#9fe8a0'); Z.meter(`筹码 <b>×${MUL[lv]}</b>`, lv / 5); Z.pop(`×${MUL[lv]}`, '#9fe8a0'); yield* line(Z, nar, pk(['{n}慢慢转了回来，正对着你——像终于肯正眼看你一次。', '转盘停了。{n}正对着你，嘴角挂着一点说不清的东西。你赢了。']), X[w]);
          if (r < 4) { const C = yield Z.choice({ title: `筹码 ×${MUL[lv]}——继续？`, opts: [{ t: '再押一把', d: `翻倍到 ×${MUL[lv + 1]}，输了清零`, v: 1, k: 'go' }, { t: '收手', d: '见好就收，筹码到手', v: 1, k: 'stop' }], time: 10 }); if (C.x.k === 'stop') { yield* line(Z, og, '格罗克把筹码揽进怀里：「见好就收——这是食人魔的智慧。」'); break; } } }
        else { Z.snd('boo'); Z.ex(bet, GRUDGE); yield* line(Z, nar, '转盘停了。你押的{n}把后脑勺留给了你——她生前大概也是这么对待讨债的人的。', X[bet]); lv = 0; Z.meter('筹码 <b>清零</b>', 0); yield* line(Z, sn, pk(['「哈！全赔光了！」', '「老大……要不咱们回去吃饭吧。」'])); break; }
      }
      Z.score(lv / 5, 3); Z.stat(`最终筹码 <b>×${MUL[lv]}</b>${lv ? '' : '（爆了）'}`);
      Z.endLine(lv >= 4 ? '三颗头在转盘上停稳，全都看着你。命运骰塔的骰子自己翻了个面——好像也服了。' : lv >= 2 ? '你把筹码收好。转盘上的三颗头还在微微晃动，像是不服气，还想再来一局。' : '转盘停了，你的运气也停了。三颗头背对着你，谁都不肯回头。');
    }
  });

  // ===================================================================== ⑦ 安魂曲（走调版）· 颅钟合唱团（需要「双生镜龛」）
  const CX = [-0.39, -0.13, 0.13, 0.39], FQ = [261.6, 329.6, 392.0, 523.3], NOTE = ['低音 Do', 'Mi', 'Sol', '高音 Do'];
  HP.reg({
    id: 'choir', ic: '🔔', n: '安魂曲（走调版）', sub: '颅钟合唱团', need: 'rh_twins', heads: 4, buff: 'hymn', col: '#a8c8ff', tag: '敲一下，唱一声——为她们自己', roles: ['低音', '中音', '高音', '最高音'],
    d: '用骨槌敲头顶，每颗头一个音。格罗克先敲一串，你按 1~4 原样重复；一轮比一轮长。错两次就散场。',
    setup(Z) { const C = Z.Z.cr = { k: [0, 0, 0, 0] }; Z.hd.forEach((h, i) => { Z.rest(i, CX[i], 0, -CX[i] * 0.5); C['b' + i] = h.Pt.clone(); }); C.g = Z.hd.map(() => { const g = Z.glowS('#a8c8ff', 0.1); g.s.material.opacity = 0; return g; }); },
    update(Z, dt) { const C = Z.Z.cr; Z.hd.forEach((hd, i) => { if (C.k[i] > 0) C.k[i] = Math.max(0, C.k[i] - dt * 3); const k = C.k[i], b = C['b' + i]; Z.at(i, [b.x, b.y - 0.012 * k, b.z], [0.18 * k, -CX[i] * 0.5, 0], 40); const g = C.g[i]; Z.wA(hd, 'crown', g.s.position); g.s.position.y += 0.02; g.s.material.opacity = 0.8 * k; g.s.visible = k > 0.02; g.s.scale.setScalar(0.06 + 0.12 * (1 - k)); }); },
    *script(Z) {
      const X = Z.x, C = Z.Z.cr; Z.keys('<b>1</b> <b>2</b> <b>3</b> <b>4</b> 依次敲'); Z.meter('音准 <b>0</b>', 0);
      const hit = (i, bad) => { C.k[i] = 1; Z.bell(FQ[i] * (bad ? 1.059 : 1), 1); if (bad) Z.snd('bad'); Z.talk(i, 0.45); Z.sway(i, 0.03, 0.02, 0.02); Z.ex(i, bad ? { sad: 0.7, angry: 0.3 } : { aa: 0.7, oh: 0.3, sad: 0.3 }, true); setTimeout(() => { try { Z.ex(i, SAD); } catch (e) { } }, 500); };
      Z.cut({ t: 'stage', az: 0, el: 0.25, d: 1.05, fov: 44 }); yield* line(Z, nar, '双生镜龛里的镜子把四颗头照成了八颗。你拿起一根骨槌，敲了敲第一颗的头顶——「嗡」。音准，出奇地准。');
      for (let i = 0; i < 4; i++) { Z.cut(face(i, { az: 0.12, el: 0.3, d: 0.32, fov: 30 })); hit(i); yield 0.35; yield* line(Z, og, SINGER.test(X[i].idk) ? '「{n}（{id}）：{note}。她生前在{loc}领唱——今天依然是领唱，只是换了个发声部位。」' : '「{n}（{id}）：{note}。她一辈子没唱过歌——今天被我敲出了声。」', Object.assign({ note: NOTE[i] }, X[i])); }
      const LEN = [3, 4, 5, 6, 7], GAP = [0.62, 0.56, 0.5, 0.45, 0.4]; let fail = 0, okN = 0, all = 0;
      for (let r = 0; r < 5 && fail < 2; r++) {
        const seq = []; for (let k = 0; k < LEN[r]; k++) { let v; do { v = Math.floor(Math.random() * 4); } while (k >= 2 && v === seq[k - 1] && v === seq[k - 2]); seq.push(v); }
        Z.cut({ t: 'stage', az: 0, el: 0.2, d: 0.95, fov: 44 }); yield* line(Z, og, pk(['「听好了——」', '「这一段难一点。」', '「跟上。」', '「最后几段了，别给我丢脸。」']));
        for (const i of seq) { Z.cut(face(i, { az: Z.pk([-0.3, 0.3]), el: 0.25, d: 0.3, fov: 30 })); hit(i); yield GAP[r]; }
        Z.cut({ t: 'stage', az: 0, el: 0.3, d: 0.9, fov: 44 }); Z.pop('到你了', Z.gm.col);
        const P = yield Z.seqIn({ seq, per: 2.6, labels: NOTE, onKey: (i, ok) => hit(i, !ok) }); okN += P.ok; all += P.n; Z.score(P.ok / P.n, P.n); Z.meter(`音准 <b>${okN}</b> / ${all}`, okN / Math.max(1, all));
        if (P.fail) { fail++; const bad = seq[P.ok] != null ? seq[P.ok] : 0; Z.hd.forEach((h, i) => Z.ex(i, GRUDGE)); yield* line(Z, nar, '当——！走调了。{n}的音在洞里拐了个弯，撞在墙上，碎了。', X[bad]); yield* line(Z, sn, fail >= 2 ? '「我耳朵……我耳朵出血了……」' : '「再来！刚才那个不算！」'); }
        else { Z.snd('cheer'); yield* line(Z, nar, pk(['余音在镜子里来回撞，像一支真的唱诗班。斯尼克听哭了——也可能是被吵哭的。', '一个音都没错。八颗头在镜子里一起张着嘴，整整齐齐。'])); }
      }
      Z.cut({ t: 'stage', az: 0, el: 0.18, d: 1.0, fov: 44, dr: { d: -0.15 } }); for (let i = 0; i < 4; i++) { hit(i); yield 0.18; } for (let i = 3; i >= 0; i--) { hit(i); yield 0.12; }
      Z.stat(`敲准 <b>${okN}</b> / ${all} 个音 · 走调 <b>${fail}</b> 次`);
      Z.endLine(fail === 0 ? '最后一个和弦落下。镜子里的八颗头一起张着嘴，好像真的在唱安魂曲——为她们自己。' : fail === 1 ? '散场时，四颗头的嘴还微微张着。她们生前大概谁也没想过，自己的最后一场演出是被人敲着头完成的。' : '安魂曲变成了噪音。四颗头歪在镜子前，像一排被敲坏的钟。');
    }
  });

  // ===================================================================== ⑧ 她的一生（删减版）· 颅偶剧场（需要新建筑「颅偶剧场」）
  const ST = { taste: { 讽刺: '「我就爱看别人倒霉。」', 反转: '「上回那出戏，结局我开头就猜到了。无聊。」', 冷笑话: '「我今天心情好，什么都想笑。」' },
    acts: [
      { n: '出身', nar: '第一幕：{loc}。一个{race}的女孩出生了，她叫{n}。她的母亲（由{m}友情客串）把她高高举起——', who: 1, vl: '「孩子，你将来一定会成为了不起的人。」',
        o: { 讽刺: ['「了不起的{id}」', '旁白：她确实成了了不起的{id}——了不起地成了一颗头。'], 反转: ['「永远别靠近山洞」', '「孩子，答应我，永远别靠近山洞。」——旁白：她答应了。可山洞靠近了她。'], 冷笑话: ['「为什么长得快」', '「为什么{race}的孩子都长得那么快？」「因为她们急着……出头。」——斯尼克：「这算什么笑话！」'] } },
      { n: '梦想', nar: '第二幕：{n}长大了。她站在{loc}的山坡上对着天空发誓：「我要{goal}！」她的宿敌（由{r}倾情出演）冷笑一声——', who: 2, vl: '「就凭你？」',
        o: { 讽刺: ['「宿敌说得对」', '旁白：宿敌说得对。'], 反转: ['「其实我佩服你」', '宿敌：「……其实我一直很佩服你。」旁白：后来宿敌也被砍了头，现在就摆在她旁边。'], 冷笑话: ['「出人头地」', '「我一定会出人头地！」旁白：她做到了。头，确实出来了。'] } },
      { n: '相遇', nar: '第三幕：一个月黑风高的夜晚，{n}举着{wpn}，遇见了一个英俊的食人魔（由格罗克本人倾情出演）。', who: 0, vl: '「怪物！我要为{loc}除害！」',
        o: { 讽刺: ['「好啊」', '英俊的食人魔回答：「好啊。」——十秒后，她成了{loc}最出名的特产。'], 反转: ['「白旗」', '{n}举起{wpn}，食人魔举起白旗。{n}放下了戒备。食人魔放下了白旗。'], 冷笑话: ['「咔嚓」', '「你知道我为什么叫格罗克吗？」「为什么？」「咔嚓。」——斯尼克笑到打滚：「这根本不是谐音！」'] } }] };
  HP.reg({
    id: 'stage', ic: '🎭', n: '她的一生（删减版）', sub: '颅偶剧场', need: 'hp_stage', heads: 3, buff: 'infamy', col: '#ff6a8a', tag: '导演、编剧、配音：格罗克。观众：斯尼克', roles: ['主演', '母亲', '宿敌'], reveal: ['name', 'race', 'goal'],
    d: '三幕木偶戏演她的一生：每幕选一句台词（1/2/3，猜中斯尼克今晚的口味），在笑点按空格拍桌；谢幕时按住空格鞠躬。',
    setup(Z) { const S = Z.Z.sg = { bow: 0 }; Z.curtain(true); [[0, 0.15, 0.06, 0], [-0.31, 0.1, -0.1, 0.35], [0.31, 0.1, -0.1, -0.35]].forEach((p, i) => Z.at(i, [p[0], Z.hd[i].H * 0.5 + p[1], p[2]], [0, p[3], 0])); S.base = Z.hd.map(h => h.Pt.clone());
      S.sticks = Z.hd.map(() => { const m = Z.prop(new THREE.CylinderGeometry(0.0055, 0.0055, 0.8, 6), { color: '#2a1a12', roughness: 0.7 }); return m; });
      for (let i = 0; i < 5; i++) { const g = Z.glowS('#ffb070', 0.08); g.s.position.set(-0.5 + i * 0.25, 0.02, 0.4); g.s.material.opacity = 0.7; } },
    update(Z, dt, t) { const S = Z.Z.sg; Z.hd.forEach((hd, i) => { const st = S.sticks[i], c = Z.wA(hd, 'cut', new THREE.Vector3()); st.position.set(c.x, c.y - 0.4, c.z); const b = S.base[i], bow = S.bow; Z.at(i, [b.x, b.y + (hd.talk > 0 ? Math.abs(Math.sin(t * 9)) * 0.02 : 0) - bow * 0.02, b.z], [bow * 0.55, [0, 0.35, -0.35][i], Math.sin(t * 1.3 + i) * 0.05], 12); }); },
    *script(Z) {
      const X = Z.x, S = Z.Z.sg, d = X[0]; Z.keys('<b>1</b> <b>2</b> <b>3</b> 选台词　<b>空格</b> 拍桌 / 按住鞠躬'); let clap = 0; Z.meter('掌声 <b>0</b>', 0);
      Z.seat(40); yield* line(Z, nar, '今晚，颅偶剧场为您献上——《{n}的一生（删减版）》。导演：格罗克。编剧：格罗克。配音：格罗克。观众：斯尼克。', d);
      const tastes = ['讽刺', '反转', '冷笑话'], taste = Z.pk(tastes); yield* line(Z, sn, ST.taste[taste]);
      Z.curtain(false); Z.snd('cheer'); Z.cut({ t: 'stage', az: 0, el: 0.18, d: 1.1, fov: 42, dr: { d: -0.15 } }); yield 1.8;
      for (let a = 0; a < 3; a++) {
        const A = ST.acts[a], ctx = Object.assign({ m: X[1].n, r: X[2].n }, d); Z.banner(`第${['一', '二', '三'][a]}幕 · ${A.n}`, '', Z.gm.col, 1.8); yield 1.6;
        Z.cut({ t: () => new THREE.Vector3(0, 0.15, -0.02), az: [0.15, -0.2, 0][a], el: 0.15, d: 0.8, fov: 40 }); yield* line(Z, nar, A.nar, ctx);
        Z.cut(face(A.who, { az: 0.15, el: 0.12, d: 0.34, fov: 30 })); yield* voiceL(Z, A.who, A.vl, ctx); Z.ex(0, a === 2 ? { angry: 0.5, sad: 0.3 } : { surprised: 0.3, sad: 0.3 });
        const opts = shuf(tastes).map(k => ({ t: fmt(A.o[k][0], ctx), d: k, v: k === taste ? 1 : k === '冷笑话' ? 0.45 : 0.6, k }));
        Z.cut({ t: () => new THREE.Vector3(0, 0.13, -0.02), az: [0.12, -0.15, 0][a], el: 0.22, d: 1.1, fov: 40 });
        const C = yield Z.choice({ title: '下一句怎么接？', opts, time: 10 });
        Z.cut(face(Z.pk([0, 1, 2]), { az: Z.pk([-0.4, 0.4]), el: 0.15, d: 0.4, fov: 34 })); Z.talk(0, 1.5); yield* line(Z, og, A.o[C.x.k][1], ctx);
        const R = yield Z.ring({ key: 'Space', at: 0.9, lead: 0.85, a: 'h0.face', tag: '拍桌！' }); Z.snd('thud'); Z.shake(0.5);
        const s = C.v * ({ perfect: 1, great: 0.85, ok: 0.6, miss: 0.3 }[R] || 0.3); Z.score(s, 1.5); clap += s; Z.meter(`掌声 <b>${Math.round(clap / (a + 1) * 100)}</b>`, clap / (a + 1));
        if (s > 0.75) { Z.snd('cheer'); yield* line(Z, sn, pk(['「哈哈哈哈哈！再来！」', '「这句我要记下来！」', '「老大你是天才！」'])); } else if (s > 0.45) yield* line(Z, sn, pk(['「嗯……还行。」', '「我笑了一下下。」'])); else { Z.snd('boo'); yield* line(Z, sn, pk(['「……冷场了。」', '「我要退票！」'])); }
      }
      Z.cut({ t: 'stage', az: 0, el: 0.15, d: 1.0, fov: 42 }); yield* line(Z, og, '「谢幕——！」三颗头一起鞠躬，由格罗克的手指代劳。');
      const B = yield Z.ring({ key: 'Space', at: 1.1, lead: 1.0, kind: 'hold', hold: 1.0, a: () => new THREE.Vector3(0, 0.2, 0.05), tag: '按住鞠躬', on: q => { S.bow = q === 'miss' ? 0.3 : 1; } }); Z.score({ perfect: 1, great: 0.85, ok: 0.6, miss: 0.2 }[B] || 0.2, 1.5); S.bow = 1; Z.snd('cheer'); Z.crystals(new THREE.Vector3(0, 0.6, 0.2), 30, true, '#ff6a8a');
      yield 1.2; S.bow = 0; Z.hd.forEach((h, i) => Z.ex(i, GRUDGE)); Z.curtain(true); yield 1.7;
      Z.stat(`掌声 <b>${Math.round(clap / 3 * 100)}</b> · 斯尼克今晚的口味：<b>${taste}</b>`);
      Z.endLine(fmt(clap / 3 > 0.8 ? '幕布落下。斯尼克站在凳子上喊「安可」。幕布后面，{n}的脸僵在鞠躬的角度——她这辈子都没演过主角，死后倒演了一回。' : clap / 3 > 0.5 ? '幕布落下，掌声稀稀拉拉。{n}被摆回原位，表情和开演前一模一样——只是眉心皱得更紧了。' : '幕布落下的时候，斯尼克已经睡着了。{n}的一生，被删减成了一个没人笑的笑话。', d));
    }
  });

  // __HPG_PART2__
})();
