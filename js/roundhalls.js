// R54k MOD round_halls（默认开，需要 round_yield）：10 座「回合制」放首级建筑——不靠点，每次回洞按各自规则结算。
// 与现有 50+ 座建筑都不重复：每座都围绕「回合」做一个取舍——轮换、陈酿、天平、献祭、震慑、赌命、议会、燃尽、百族、双生。
// 规则函数注册到 Loop.ROUND[type]（settle 时调用），建筑模型全部程序化，只通过 BuildCat.C / Unlocks.R / G.HOOK 挂载。
window.RoundHalls = (() => {
  const on = () => (!window.Mods || (Mods.on('round_halls') !== false && Mods.on('round_yield') !== false && Mods.on('run_loop') !== false));
  if (!on() || !window.BuildCat || !window.Loop) return { off: true };
  const BC = BuildCat, C = BC.C, M = BC.M, { box, cyl, mesh, std, glowMat, flame, skull, rock } = BC, V3 = THREE.Vector3, RO = Loop.ROUND;
  const ring = (n, r, y, a0 = 0, out = true) => Array.from({ length: n }, (_, k) => { const a = a0 + k / n * Math.PI * 2; return [Math.cos(a) * r, y, Math.sin(a) * r, out ? Math.atan2(Math.cos(a), Math.sin(a)) : Math.atan2(-Math.cos(a), -Math.sin(a))]; });
  const key = b => b.type + '@' + (+b.x).toFixed(1) + ',' + (+b.z).toFixed(1);
  const ST = b => { const r = Loop.R(); return (r.bst[key(b)] = r.bst[key(b)] || {}); };
  const hs = b => (b.heads || []).filter(Boolean);
  const NM = h => (h && h.rec && h.rec.c && (h.rec.c.name || '').split('·')[0]) || '她';
  const wt = h => (h.rec.c.rar | 0) + (h.rec.c.shiny ? 1 : 0) + (h.rec.c.boss ? 2 : 0);
  const RACEB = { human: ['dmg', 0.12, '人类议会：伤害 +12%'], elf: ['spd', 0.1, '精灵议会：移速 +10%'], halfelf: ['spd', 0.08, '半精灵议会：移速 +8%'], darkelf: ['dmg', 0.1, '暗精灵议会：伤害 +10%'], beast: ['hp', 0.18, '兽人议会：生命 +18%'], demon: ['heal', 0.03, '魅魔议会：每杀回血 3%'], angel: ['hp', 0.14, '天使议会：生命 +14%'], dragon: ['dmg', 0.14, '龙裔议会：伤害 +14%'], vampire: ['heal', 0.04, '吸血鬼议会：每杀回血 4%'] };
  const ROUNDTAG = '<br><b style="color:#ffd890">【回合制】</b>';
  const brass = std('#b8903a', { metalness: 0.85, roughness: 0.35 }), moonM = glowMat('#cfe0ff', 1.3), ember = glowMat('#ff6a2a', 1.6), clay = std('#7a4a2a', { roughness: 0.9 }), wax = std('#e8dcc0', { roughness: 0.6 });

  // 1) 月相晷台：四个月相位，每回合只有被月光照到的那一位 ×4，其余 ×0.25；月光每回合顺时针移一位
  C.rh_moondial = { cat: 'func', n: '月相晷台', icon: '🌗', base: 700, grow: 1.6, fp: [0.62, 0.62], stat: { soul: 2 }, depth: 1,
    desc: '圆形石晷上四根月柱。' + ROUNDTAG + '每回合只有<b>被月光照到的那一位</b>产出 ×4，其余三位 ×0.25；结算后月光顺时针移到下一位。把最好的首级排在下回合会被照到的位置。',
    mount: { y: 0.98, period: 1e9, mult: 0, labelY: 1.5, slots: ring(4, 0.46, 0.98, Math.PI / 4) },
    make() { const g = new THREE.Group(), U = g.userData; g.add(cyl(0.6, 0.66, 0.12, M.dark, 0, 0.06, 0, 32)); g.add(cyl(0.52, 0.54, 0.05, M.stone, 0, 0.145, 0, 32));
      for (const [x, , z] of ring(4, 0.46, 0, Math.PI / 4)) { g.add(cyl(0.06, 0.08, 0.8, M.stone, x, 0.55, z, 10)); g.add(cyl(0.1, 0.07, 0.05, M.stone, x, 0.96, z, 12)); }
      const mk = new THREE.Group(); mk.position.y = 0.18; g.add(mk); U.mark = mk;
      const beam = box(0.42, 0.012, 0.07, moonM, 0.21, 0, 0); mk.add(beam); const cres = mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 20, Math.PI * 1.3), moonM, 0.44, 0.03, 0); cres.rotation.x = Math.PI / 2; mk.add(cres);
      g.add(cyl(0.05, 0.05, 0.25, brass, 0, 0.27, 0, 8)); const l = new THREE.PointLight('#cfe0ff', 0.6, 2.4); l.position.set(0, 1.4, 0); g.add(l); U.lamp = l; return g; },
    cols: () => [[-0.58, 0, -0.58, 0.58, 0.18, 0.58]] };
  RO.rh_moondial = (b, L, x) => { const s = x.st(b), ph = (s.ph | 0) % 4; let v = 0, lit = ''; b.heads.forEach((h, i) => { if (!h) return; const k = i === ph ? 4 : 0.25; v += x.val(h, k); if (i === ph) lit = NM(h); }); s.ph = (ph + 1) % 4; return { v, note: lit ? `月光照着「${lit}」×4 · 下回合照第 ${s.ph + 1} 位` : `月光照着空位（第 ${ph + 1} 位）· 下回合照第 ${s.ph + 1} 位` }; };

  // 2) 酿魂坛：首级封进坛里不产出，但每回合往坛里酿魂（第 n 回合酿 0.6×n 份，越久越多）；空手 E 开坛取走；坛里有酒时取下首级 = 全洒
  C.rh_brewjar = { cat: 'func', n: '酿魂坛', icon: '🏺', base: 500, grow: 1.6, fp: [0.36, 0.36], stat: { con: 1 }, depth: 1,
    desc: '半人高的陶坛，首级封在坛口。' + ROUNDTAG + '她本身不产出，但每回合往坛里酿魂：第 1 回合 0.6 份、第 2 回合再 1.2 份、第 3 回合再 1.8 份……（最多酿 8 回合）。<b>空手按 E 开坛</b>一次取走全部。坛里有酒时把她取下来——酒全洒了。',
    mount: { y: 0.86, period: 1e9, mult: 0, labelY: 1.4, slots: [[0, 0.86, 0, Math.PI]] },
    make() { const g = new THREE.Group(); const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(new THREE.Vector2(0.14 + Math.sin(u * Math.PI) * 0.2 + (u > 0.85 ? -0.06 : 0), u * 0.8)); }
      g.add(mesh(new THREE.LatheGeometry(pts, 24), clay)); const lip = mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 20), clay, 0, 0.8, 0); lip.rotation.x = Math.PI / 2; g.add(lip);
      const rope = mesh(new THREE.TorusGeometry(0.3, 0.015, 5, 24), std('#a88a5a', { roughness: 1 }), 0, 0.52, 0); rope.rotation.x = Math.PI / 2; g.add(rope);
      const tag = box(0.14, 0.18, 0.005, std('#d84a2a', { roughness: 1, side: THREE.DoubleSide }), 0, 0.46, 0.33); g.add(tag); return g; },
    cols: () => [[-0.3, 0, -0.3, 0.3, 0.8, 0.3]] };
  RO.rh_brewjar = (b, L, x) => { const s = x.st(b), h = L[0]; s.n = Math.min(8, (s.n | 0) + 1); s.pot = Math.round((s.pot || 0) + x.val(h, 0.6 * s.n)); return { v: 0, note: `已酿 ${s.n} 回合，坛里 🔮${s.pot}（空手 E 开坛）` }; };

  // 3) 审判天平：两个秤盘各放一颗。更重（魂阶+异色+霸主）的一边 ×2.5、轻的一边 ×0；一样重 → 两颗都 ×1.8；只放一颗 ×0.5
  C.rh_scales = { cat: 'func', n: '审判天平', icon: '⚖️', base: 600, grow: 1.6, fp: [0.7, 0.32], stat: { ter: 2 }, depth: 1,
    desc: '一架铁天平，两边秤盘各放一颗首级。' + ROUNDTAG + '<b>重的一边 ×2.5，轻的一边 ×0</b>（重量 = 魂阶 + 异色 1 + 霸主 2）；<b>一样重 → 两颗都 ×1.8</b>；只放一颗 ×0.5。',
    mount: { y: 1.02, period: 1e9, mult: 0, labelY: 1.7, slots: [[-0.46, 1.02, 0, Math.PI], [0.46, 1.02, 0, Math.PI]] },
    make() { const g = new THREE.Group(), U = g.userData; g.add(cyl(0.18, 0.24, 0.08, M.dark, 0, 0.04, 0, 16)); g.add(cyl(0.03, 0.04, 1.3, M.iron, 0, 0.69, 0, 8));
      const bm = new THREE.Group(); bm.position.y = 1.3; g.add(bm); U.beam = bm; bm.add(box(1.0, 0.035, 0.035, M.iron)); bm.add(mesh(new THREE.ConeGeometry(0.04, 0.1, 6), brass, 0, 0.06, 0));
      for (const s of [-1, 1]) { const pan = new THREE.Group(); pan.position.x = s * 0.46; bm.add(pan); for (const a of [0, 2.1, 4.2]) { const c = cyl(0.004, 0.004, 0.28, M.iron, Math.cos(a) * 0.1, -0.14, Math.sin(a) * 0.1, 4); pan.add(c); } pan.add(cyl(0.14, 0.1, 0.03, brass, 0, -0.28, 0, 18)); U['pan' + (s > 0 ? 1 : 0)] = pan; }
      return g; },
    cols: () => [[-0.2, 0, -0.2, 0.2, 1.32, 0.2]] };
  RO.rh_scales = (b, L, x) => { const a = b.heads[0], c = b.heads[1]; if (!a || !c) { const h = a || c; return { v: x.val(h, 0.5), note: '只有一边有头：×0.5' }; } const wa = wt(a), wc = wt(c);
    if (wa === wc) return { v: x.val(a, 1.8) + x.val(c, 1.8), note: `两边一样重（${wa}）：都 ×1.8` }; const [hi, lo] = wa > wc ? [a, c] : [c, a]; return { v: x.val(hi, 2.5), note: `「${NM(hi)}」更重 ×2.5，「${NM(lo)}」×0` }; };

  // 4) 吞首井：回合结算时把井边的首级吞下去——一次性给 6 回合的量 + 一次肉鸽祝福抉择
  C.rh_maw = { cat: 'func', n: '吞首井', icon: '🕳️', base: 900, grow: 1.7, fp: [0.62, 0.62], stat: { soul: 3 }, depth: 1,
    desc: '一口会呼吸的井，井沿上有一根骨钩。' + ROUNDTAG + '回洞结算时，<b>井会吞掉钩上的首级</b>：一次性给她 6 回合的产出 + <b>一次额外的祝福抉择</b>（本局的武器流派/技能）。别把舍不得的头挂上去。',
    mount: { y: 0.98, period: 1e9, mult: 0, labelY: 1.5, slots: [[0, 0.98, 0.52, 0]] },
    make() { const g = new THREE.Group(); const rim = mesh(new THREE.TorusGeometry(0.42, 0.11, 10, 28), M.stone, 0, 0.32, 0); rim.rotation.x = Math.PI / 2; g.add(rim); g.add(cyl(0.5, 0.56, 0.3, M.dark, 0, 0.15, 0, 28));
      const pit = mesh(new THREE.CircleGeometry(0.34, 28), new THREE.MeshBasicMaterial({ color: '#050203' }), 0, 0.33, 0); pit.rotation.x = -Math.PI / 2; g.add(pit);
      const eye = mesh(new THREE.SphereGeometry(0.05, 10, 8), glowMat('#ff3a2a', 1.4), 0, 0.2, 0); g.add(eye); g.userData.eye = eye;
      g.add(cyl(0.025, 0.035, 0.75, M.bone, 0, 0.6, 0.52, 8)); g.add(mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), M.bone, 0, 0.98, 0.46)); return g; },
    cols: () => [[-0.55, 0, -0.55, 0.55, 0.42, 0.55]] };
  RO.rh_maw = (b, L, x) => { const h = L[0], v = x.val(h, 6); x.rm.push(h); x.boons++; return { v, note: `吞下了「${NM(h)}」：6 回合的量 + 1 次祝福抉择` }; };

  // 5) 示威矛墙：插在洞口的五根长矛。不产魂晶——每颗首级让宿敌逼近慢 8%（最多 -45%），下一趟敌人生命 -3%（最多 -15%）
  C.rh_palisade = { cat: 'func', n: '示威矛墙', icon: '🪓', base: 400, grow: 1.55, fp: [1.0, 0.25], stat: { ter: 3 }, depth: 1,
    desc: '五根长矛一字排开，首级朝外示威。' + ROUNDTAG + '<b>不产魂晶</b>：每颗首级让「宿敌逼近」慢 8%（最多 -45%），并让下一趟的敌人生命 -3%（最多 -15%）——她们看见了你的墙。',
    mount: { y: 1.62, period: 1e9, mult: 0, labelY: 2.1, slots: [-0.8, -0.4, 0, 0.4, 0.8].map(x => [x, 1.62, 0, 0]) },
    make() { const g = new THREE.Group(); g.add(box(2.0, 0.14, 0.3, M.dark, 0, 0.07, 0));
      for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) { const p = cyl(0.022, 0.03, 1.55, M.wood, x, 0.85, 0, 7); p.rotation.z = (Math.random() - 0.5) * 0.06; g.add(p); g.add(mesh(new THREE.ConeGeometry(0.03, 0.16, 6), M.iron, x, 1.68, 0)); g.add(cyl(0.008, 0.012, 0.3, M.blood, x + 0.015, 1.4, 0.02, 5)); }
      for (const s of [-1, 1]) { const br = box(1.9, 0.04, 0.04, M.wood, 0, 0.5 + (s > 0 ? 0.45 : 0), 0.05); g.add(br); } g.add(skull(0.9, -0.95, 0.2, 0.1)); return g; },
    cols: () => [[-1.0, 0, -0.15, 1.0, 1.6, 0.15]] };
  RO.rh_palisade = (b, L, x) => { x.bless('fear', Math.min(0.15, 0.03 * L.length)); return { v: 0, note: `${L.length} 颗示威：宿敌逼近 -${Math.round(Math.min(0.45, L.length * 0.08) * 100)}%（全洞合计封顶 45%）· 下一趟敌人生命 -${Math.round(Math.min(0.15, 0.03 * L.length) * 100)}%` }; };

  // 6) 命运骰塔：每回合掷一次命运骰：1 = 首级碎裂（只给 ×1），2-3 ×1，4-5 ×3，6 ×6
  C.rh_dice = { cat: 'func', n: '命运骰塔', icon: '🎲', base: 450, grow: 1.6, fp: [0.4, 0.4], stat: { agi: 2 }, depth: 1,
    desc: '骨头搭的高塔，顶上托着首级，塔里滚着一颗骨骰。' + ROUNDTAG + '每回合掷一次：<b>1 = 首级碎裂</b>（只给 ×1 然后没了），2-3 ×1，4-5 ×3，<b>6 ×6</b>。期望 ≈ ×2.3——赌不赌？',
    mount: { y: 1.34, period: 1e9, mult: 0, labelY: 1.9, slots: [[0, 1.34, 0, Math.PI]] },
    make() { const g = new THREE.Group(), U = g.userData; g.add(box(0.5, 0.1, 0.5, M.dark, 0, 0.05, 0));
      for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(cyl(0.025, 0.03, 1.2, M.bone, x * 0.17, 0.68, z * 0.17, 6));
      g.add(box(0.44, 0.05, 0.44, M.bone, 0, 1.3, 0)); g.add(box(0.44, 0.04, 0.44, M.bone, 0, 0.62, 0));
      const die = box(0.16, 0.16, 0.16, std('#efe6d0', { roughness: 0.5 }), 0, 0.84, 0); g.add(die); U.die = die;
      for (let i = 0; i < 6; i++) die.add(mesh(new THREE.SphereGeometry(0.018, 6, 4), std('#5a0a0a'), [0.081, -0.081, 0, 0, 0, 0][i], [0, 0, 0.081, -0.081, 0, 0][i], [0, 0, 0, 0, 0.081, -0.081][i])); return g; },
    cols: () => [[-0.25, 0, -0.25, 0.25, 1.32, 0.25]] };
  RO.rh_dice = (b, L, x) => { const h = L[0], s = x.st(b); let d = 1 + Math.floor(Math.random() * 6); s.last = d;
    if (d === 1 && x.r.ward) { x.r.ward = 0; return { v: x.val(h, 1), note: '🎲 1 —— 🧿护头符挭住了，她没碎' }; }
    if (d === 1) { x.rm.push(h); return { v: x.val(h, 1), note: `🎲 1 —「${NM(h)}」碎了` }; } const k = d >= 6 ? 6 : d >= 4 ? 3 : 1; return { v: x.val(h, k), note: `🎲 ${d} → ×${k}` }; };

  // 7) 亡者议会：五把椅子。每颗 ×0.5；同族 ≥3 = 多数派，给下一趟一条该族的祝福（五颗同族 ×2）
  C.rh_council = { cat: 'func', n: '亡者议会', icon: '🗳️', base: 1200, grow: 1.65, fp: [0.95, 0.75], stat: { soul: 2, ter: 1 }, depth: 1,
    desc: '半圆的五把高背椅，首级坐在椅背上开会。' + ROUNDTAG + '每颗只产 ×0.5，但<b>同族 ≥3 颗 = 多数派</b>，给下一趟一条该族的祝福：人类伤害、精灵移速、兽人生命、吸血鬼/魅魔每杀回血、龙裔重击……<b>五颗同族祝福翻倍</b>。',
    mount: { y: 1.2, period: 1e9, mult: 0, labelY: 1.8, slots: [0, 1, 2, 3, 4].map(i => { const a = Math.PI * (0.15 + i * 0.175); return [Math.cos(a) * 0.62, 1.2, -Math.sin(a) * 0.62 + 0.3, Math.atan2(-Math.cos(a), Math.sin(a))]; }) },
    make() { const g = new THREE.Group(); g.add(cyl(0.2, 0.24, 0.5, M.stone, 0, 0.25, 0.3, 10)); g.add(cyl(0.22, 0.22, 0.03, std('#4a0a1a', { roughness: 1 }), 0, 0.51, 0.3, 16));
      for (let i = 0; i < 5; i++) { const a = Math.PI * (0.15 + i * 0.175), x = Math.cos(a) * 0.62, z = -Math.sin(a) * 0.62 + 0.3, ch = new THREE.Group(); ch.position.set(x, 0, z); ch.rotation.y = Math.atan2(-x, 0.3 - z); g.add(ch);
        ch.add(box(0.22, 0.04, 0.22, M.wood, 0, 0.42, 0)); for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) ch.add(box(0.025, 0.42, 0.025, M.wood, dx * 0.09, 0.21, dz * 0.09)); ch.add(box(0.22, 0.62, 0.03, M.wood, 0, 0.82, -0.1)); }
      return g; },
    cols: () => [[-0.7, 0, -0.45, 0.7, 1.1, 0.45]] };
  RO.rh_council = (b, L, x) => { let v = 0; const cnt = {}; for (const h of L) { v += x.val(h, 0.5); cnt[h.rec.c.race] = (cnt[h.rec.c.race] || 0) + 1; }
    const top = Object.keys(cnt).sort((a, c) => cnt[c] - cnt[a])[0], n = top ? cnt[top] : 0; if (n < 3) return { v, note: `议而不决（最多 ${n} 颗同族，需要 3）` };
    const B = RACEB[top] || ['clear', 0.35, `${top}议会：清空奖励 +35%`], k = n >= 5 ? 2 : 1; x.bless(B[0], B[1] * k); return { v, note: `${B[2]}${k > 1 ? '（全票 ×2）' : ''} → 下一趟` }; };

  // 8) 烽火首台：首级放在火盆上燃烧：每回合 ×3，第 3 回合烧成灰——留下「余烬」：下一趟伤害 +15%
  C.rh_pyre = { cat: 'func', n: '烽火首台', icon: '🔥', base: 350, grow: 1.55, fp: [0.42, 0.42], stat: { str: 2 }, depth: 1,
    desc: '铁架火盆，首级放在火上慢慢烧。' + ROUNDTAG + '<b>每回合 ×3</b>，但第 3 回合结算后她会烧成灰——留下「余烬」：<b>下一趟伤害 +15%</b>。用来烧掉你不在乎的头。',
    mount: { y: 0.98, period: 1e9, mult: 0, labelY: 1.6, slots: [[0, 0.98, 0, Math.PI]] },
    make() { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, lg = cyl(0.018, 0.025, 0.9, M.iron, Math.cos(a) * 0.18, 0.45, Math.sin(a) * 0.18, 6); lg.rotation.z = Math.cos(a) * 0.15; lg.rotation.x = -Math.sin(a) * 0.15; g.add(lg); }
      const bowl = mesh(new THREE.SphereGeometry(0.26, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std('#2a2226', { metalness: 0.7, roughness: 0.5, side: THREE.DoubleSide }), 0, 0.98, 0); g.add(bowl);
      const coal = mesh(new THREE.CircleGeometry(0.22, 18), ember, 0, 0.9, 0); coal.rotation.x = -Math.PI / 2; g.add(coal);
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; g.add(flame(Math.cos(a) * 0.13, 0.9, Math.sin(a) * 0.13, 0.9, '#ff7a2a')); }
      const l = new THREE.PointLight('#ff7a2a', 0.9, 3); l.position.y = 1.2; g.add(l); g.userData.lamp = l; return g; },
    cols: () => [[-0.26, 0, -0.26, 0.26, 0.98, 0.26]] };
  RO.rh_pyre = (b, L, x) => { const h = L[0], s = x.st(b); if (s.id !== h.rec.id) { s.id = h.rec.id; s.n = 0; } s.n = (s.n | 0) + 1; const v = x.val(h, 3);
    if (s.n >= 3) { x.rm.push(h); x.bless('dmg', 0.15); s.n = 0; s.id = null; return { v, note: `「${NM(h)}」烧成了灰 → 余烬：下一趟伤害 +15%` }; } return { v, note: `燃烧 ${s.n}/3` }; };

  // 9) 百族谱：一棵挂满名牌的枯树，6 个枝头。不同种族越多每颗越多（×0.4 + 0.3×种族数）；≥5 族 → 额外一次祝福抉择
  C.rh_family = { cat: 'func', n: '百族谱', icon: '🌳', base: 1500, grow: 1.7, fp: [0.7, 0.7], stat: { soul: 3 }, depth: 2,
    desc: '一棵挂满名牌的枯树，6 根枝头。' + ROUNDTAG + '<b>种族越杂越值钱</b>：每颗 ×(0.4 + 0.3 × 不同种族数)，6 族齐 = 每颗 ×2.2；<b>≥5 族再给一次祝福抉择</b>。（和「同族套装」正好相反——两种收集方向。）',
    mount: { y: 1.5, period: 1e9, mult: 0, labelY: 2.3, slots: ring(6, 0.52, 1.5, 0).map((s, i) => [s[0], s[1] + (i % 2) * 0.32, s[2], s[3]]) },
    make() { const g = new THREE.Group(); g.add(rock(0.3, M.dark, 0, 0.08, 0)); g.add(cyl(0.07, 0.12, 1.9, M.wood, 0, 0.95, 0, 8));
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, y = 1.3 + (i % 2) * 0.32, br = cyl(0.015, 0.03, 0.56, M.wood, Math.cos(a) * 0.26, y + 0.05, Math.sin(a) * 0.26, 6); br.rotation.z = -Math.cos(a) * 1.25; br.rotation.x = Math.sin(a) * 1.25; g.add(br);
        g.add(box(0.1, 0.06, 0.005, wax, Math.cos(a) * 0.3, y - 0.2, Math.sin(a) * 0.3)); }
      return g; },
    cols: () => [[-0.15, 0, -0.15, 0.15, 1.9, 0.15]] };
  RO.rh_family = (b, L, x) => { const d = new Set(L.map(h => h.rec.c.race)).size, k = 0.4 + 0.3 * d; let v = 0; for (const h of L) v += x.val(h, k); if (d >= 5) x.boons++; return { v, note: `${d} 个种族：每颗 ×${k.toFixed(1)}${d >= 5 ? ' + 1 次祝福抉择' : ''}` }; };

  // 10) 双生镜龛：镜子两侧各一颗。同身份 / 同发色 / 同族同阶 = 双生，两颗都 ×3；否则 ×0.6
  C.rh_twins = { cat: 'func', n: '双生镜龛', icon: '🪞', base: 800, grow: 1.6, fp: [0.7, 0.36], stat: { soul: 2 }, depth: 1,
    desc: '一面立镜，镜子两侧各有一个龛位。' + ROUNDTAG + '两颗是<b>「双生」</b>（同身份 / 同发色 / 同族同阶）→ <b>两颗都 ×3</b>；不像 → 各 ×0.6。',
    mount: { y: 1.08, period: 1e9, mult: 0, labelY: 1.8, slots: [[-0.42, 1.08, 0.04, Math.PI / 2 + Math.PI], [0.42, 1.08, 0.04, -Math.PI / 2 + Math.PI]] },
    make() { const g = new THREE.Group(); g.add(box(1.2, 0.08, 0.4, M.dark, 0, 0.04, 0));
      for (const s of [-1, 1]) { g.add(cyl(0.12, 0.15, 0.95, M.stone, s * 0.42, 0.5, 0.04, 10)); g.add(cyl(0.16, 0.12, 0.05, brass, s * 0.42, 1.0, 0.04, 14)); }
      const mir = mesh(new THREE.PlaneGeometry(0.34, 0.9), std('#cfd8e0', { metalness: 1, roughness: 0.05, side: THREE.DoubleSide }), 0, 1.0, 0.04); mir.rotation.y = Math.PI / 2; g.add(mir);
      const fr = box(0.04, 0.98, 0.42, brass, 0, 1.0, 0.04); g.add(fr); mir.position.x = 0.025; const mir2 = mir.clone(); mir2.position.x = -0.025; g.add(mir2); return g; },
    cols: () => [[-0.6, 0, -0.2, 0.6, 1.0, 0.2]] };
  const twin = (a, c) => { if (!a || !c) return ''; const A = a.rec, B = c.rec; if (A.c.id === B.c.id) return '同身份'; if (A.look && B.look && A.look.hn && A.look.hn === B.look.hn) return '同发色'; if (A.c.race === B.c.race && (A.c.rar | 0) === (B.c.rar | 0)) return '同族同阶'; return ''; };
  RO.rh_twins = (b, L, x) => { const a = b.heads[0], c = b.heads[1], t = twin(a, c); if (t) return { v: x.val(a, 3) + x.val(c, 3), note: `双生（${t}）：两颗都 ×3` }; let v = 0; for (const h of L) v += x.val(h, 0.6); return { v, note: L.length < 2 ? '只有一颗：×0.6' : '不像：各 ×0.6' }; };

  // ---- 其它所有放首级建筑：说明里补上回合制规则 ----
  setTimeout(() => { for (const k in C) { const d = C[k]; if (!d.mount || RO[k] || d.__rh) continue; d.__rh = 1; const f = Loop.bf ? Loop.bf(d) : 1; d.desc = (d.desc || '') + ROUNDTAG + (f ? `回洞结算：每颗首级 ×${f.toFixed(2)}（摆着就有，不用点；同族/同身份/五阶齐全有套装加成）` : '这座建筑不产魂晶'); } }, 0);

  // ---- 交互 / 提示 / 动画 ----
  function onE(hit, held, pickup) {
    const b = hit && hit.build; if (!b || pickup || held || b.type !== 'rh_brewjar') return false; const s = ST(b);
    if (!(s.pot > 0)) { G.toast('🏺 坛里还是空的——让她多泡几个回合', '#ccc', 1.8); return true; }
    const v = Math.round(s.pot); s.pot = 0; s.n = 0; G.addCoins(v); try { SFX.coins && SFX.coins(); G.burst(new V3(b.x, 1, b.z), '#ffd86a', 30, 1.4, 0.8, -2); G.floatText('+' + v, new V3(b.x, 1.3, b.z), '#ffd86a', 26); } catch (e) { }
    G.toast(`🏺 <b>开坛！</b>陈了好几个回合的魂酿 · 🔮+${v}`, '#ffe0a0', 3); G.save(); return true;
  }
  function onTip(hit, held) {
    const b = hit && hit.build; if (!b || !C[b.type] || !RO[b.type] || held) return null; const s = ST(b), d = C[b.type], L = hs(b), n = `${d.icon} <b>${d.n}</b>（${L.length}/${b.heads.length}）· `;
    switch (b.type) {
      case 'rh_moondial': return n + `本回合月光照第 ${((s.ph | 0) % 4) + 1} 位（×4）`;
      case 'rh_brewjar': return n + (s.pot > 0 ? `已酿 ${s.n} 回合，坛里 🔮${s.pot} · <b>[E]</b> 开坛` : '封一颗首级进去，回合越多酿得越多');
      case 'rh_scales': { const a = b.heads[0], c = b.heads[1]; return n + (a && c ? `左 ${wt(a)} : 右 ${wt(c)}${wt(a) === wt(c) ? ' · 平衡 ×1.8' : ''}` : '两边都放才算数'); }
      case 'rh_maw': return n + (L.length ? '下次回洞，井会把她吞掉（6 回合的量 + 祝福抉择）' : '挂一颗你舍得的首级');
      case 'rh_palisade': return n + `宿敌逼近 -${Math.round(Math.min(0.45, L.length * 0.08) * 100)}% · 敌人生命 -${Math.round(Math.min(0.15, L.length * 0.03) * 100)}%`;
      case 'rh_dice': return n + (s.last ? `上回合掷出 ${s.last}` : '每回合掷一次命运骰');
      case 'rh_council': { const cnt = {}; L.forEach(h => cnt[h.rec.c.race] = (cnt[h.rec.c.race] || 0) + 1); const m = Math.max(0, ...Object.values(cnt)); return n + (m >= 3 ? '多数派成立 → 下一趟祝福' : `最多 ${m} 颗同族（需要 3）`); }
      case 'rh_pyre': return n + (L.length ? `燃烧 ${s.id === (L[0] && L[0].rec.id) ? (s.n | 0) : 0}/3` : '放一颗首级上去烧');
      case 'rh_family': return n + `${new Set(L.map(h => h.rec.c.race)).size} 个种族`;
      case 'rh_twins': { const t = twin(b.heads[0], b.heads[1]); return n + (t ? `双生（${t}）×3` : '找两颗相像的'); }
    }
    return null;
  }
  function tick(dt, now) {
    for (const b of G.builds) { const U = b.g && b.g.userData; if (!U || !RO[b.type]) continue;
      try { if (b.type === 'rh_moondial' && U.mark) { const s = ST(b), want = Math.PI / 4 + ((s.ph | 0) % 4) * Math.PI / 2; U.mark.rotation.y += ((-want) - U.mark.rotation.y) * Math.min(1, dt * 3); U.lamp.intensity = 0.5 + Math.sin(now * 2) * 0.15; }
        else if (b.type === 'rh_scales' && U.beam) { const a = b.heads[0], c = b.heads[1], d = (a ? wt(a) + 1 : 0) - (c ? wt(c) + 1 : 0), want = Math.max(-0.35, Math.min(0.35, d * 0.08)); U.beam.rotation.z += (want - U.beam.rotation.z) * Math.min(1, dt * 2); U.pan0.rotation.z = U.pan1.rotation.z = -U.beam.rotation.z; }
        else if (b.type === 'rh_dice' && U.die) { U.die.rotation.x += dt * 0.7; U.die.rotation.y += dt * 1.1; }
        else if (b.type === 'rh_maw' && U.eye) U.eye.scale.setScalar(1 + Math.sin(now * 1.3) * 0.25);
        else if (b.type === 'rh_pyre' && U.lamp) U.lamp.intensity = 0.8 + Math.sin(now * 13) * 0.12 + Math.sin(now * 7.3) * 0.1;
        else if (b.type === 'rh_brewjar') { const s = ST(b); if (s.pot > 0 && !b.heads[0]) { s.pot = 0; s.n = 0; G.toast('🏺 你把她从坛口拔了出来——酿了几个回合的魂酒全洒了。', '#ff9a8a', 3); } }
      } catch (e) { if (!tick._w) { tick._w = 1; console.warn('roundhalls', b.type, e); } } }
  }
  (function unlocks() {
    if (!window.Unlocks || !Unlocks.R) return; const R = Unlocks.R, H = S => S.heads.length, T = S => (S.stats && S.stats.trips) || 0;
    R.rh_pyre = [S => T(S) >= 1, '第一次出猎回来。你看着洞里的火盆，想到了一个处理多余首级的办法。'];
    R.rh_palisade = [S => T(S) >= 1, '有人在跟踪你回洞。你决定在洞口立一道让她们害怕的墙。'];
    R.rh_dice = [S => T(S) >= 2, '地精斯尼克在角落里掷骨骰，输光了裤子：「拿首级赌，才刺激。」'];
    R.rh_brewjar = [S => H(S) >= 3, '你在废墟里捡到一口封着泥的陶坛，摇一摇——里面有东西在发酵。'];
    R.rh_scales = [S => H(S) >= 4, '审判庭的天平被你扛了回来。轻重，总要分个高下。'];
    R.rh_twins = [S => H(S) >= 5, '两颗头放在一起时，你分不清谁是谁。'];
    R.rh_moondial = [S => H(S) >= 6, '月光每晚只照进洞里的一个角落，而且每晚都换一个。'];
    R.rh_council = [S => H(S) >= 7, '首级多到可以开会了。她们好像真的在商量什么。'];
    R.rh_maw = [S => T(S) >= 3, '洞底裂开了一口会呼吸的井。它饿了。'];
    R.rh_family = [S => H(S) >= 9, '你的收藏里种族越来越杂——该给她们立一本族谱了。'];
  })();
  const wait = setInterval(() => { if (!window.G || !G.HOOK) return; clearInterval(wait); G.HOOK.frame.push(tick); G.HOOK.e.push(onE); G.HOOK.tip.push(onTip); if (window.Unlocks && Unlocks.scan && G.S) try { Unlocks.scan(true); } catch (e) { } }, 150);
  return { ST, key, twin, wt };
})();
