// ============================================================================
// 🫀 organs.js —— 尸体解剖 & 器官标本（Arena Agent · 第二十二轮续 6）
//   · 尸体 / 兽骸的战利品面板多一个「🔪 解剖」按钮 → 取出整具身体的非生殖类器官
//   · 每件器官带「归属」(谁的、什么种族、几阶魂) 和「属性」(品质、加成、同主套装)
//   · 器官可以装瓶摆在洞里（走 Props 系统，无碰撞），也可以炼化成魂尘
//   · MOD「organs」可关；关掉后已有的器官物品仍在，只是不能解剖
//   ⚠ 模型说明：器官是 **低多边形程序化** 模型（没有合适的 CC0 解剖模型，Z-Anatomy 是 CC-BY-SA 会污染仓库许可）。
//     这是 js/builds.js 之后第二个“程序化模型”例外，已在 HANDOFF 标注；以后找到 CC0 器官 GLB 可直接替换 model()。
//   · 内容边界：只做内脏 / 感官 / 骨骼 / 血液；不含任何生殖或性相关器官。
// ============================================================================
window.Organs = (() => {
  const THREE = window.THREE, V3 = THREE.Vector3;
  const on = () => !(window.Mods && Mods.on && Mods.on('organs') === false);
  const RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'], RC = ['#b8b8c0', '#4aa8ff', '#c05aff', '#ffb020', '#ff4a8a'];
  const SN = { str: '力量', con: '体魄', agi: '敏捷', ter: '胆魄', soul: '魂力' };
  // t: 类型；st: 基础属性；au/pk: 光环 / 戳击加成；tk: 定时产出；r: 范围；p: 普通尸体取得概率
  const OG = {
    heart:  { n: '心脏', icon: '❤️', st: { con: 2 }, au: 0.06, p: 1, note: '泵血的肌肉，离体后还能记得节拍。' },
    lung:   { n: '肺', icon: '🫁', st: { agi: 2 }, au: 0.05, p: 0.9, note: '一对，海绵状，含着最后一口气。' },
    liver:  { n: '肝', icon: '🍖', st: { str: 2 }, p: 0.9, note: '最大的实质器官，沉甸甸的。' },
    kidney: { n: '肾', icon: '🫘', st: { ter: 2 }, p: 0.8, note: '一对，蚕豆形。' },
    stomach:{ n: '胃', icon: '🥩', st: { con: 1 }, tk: { every: 45, kind: 'herb', n: 1 }, p: 0.8, note: '袋状，会缓慢“消化”瓶里的东西，产出草药。' },
    gut:    { n: '肠', icon: '🪱', au: 0.09, r: 4, p: 0.9, note: '盘了好几圈，光环范围大。' },
    brain:  { hid: 1, n: '大脑', icon: '🧠', st: { soul: 2 }, pk: 0.15, p: 1, note: '沟回细密，魂力的居所。' },
    eye:    { hid: 1, n: '眼球', icon: '👁️', st: { soul: 1 }, pk: 0.2, p: 1, note: '虹膜颜色随归属者而异。它会转向你。' },
    tongue: { hid: 1, n: '舌', icon: '👅', st: { agi: 1 }, pk: 0.12, p: 0.7, note: '肌肉质，舌面留着细小的纹路。' },
    spleen: { n: '脾', icon: '🟣', tk: { every: 60, kind: 'coin', n: 30 }, p: 0.6, note: '暗紫色，像一枚扁平的果子。定时产出魂晶。' },
    gall:   { n: '胆', icon: '🟢', st: { str: 1, ter: 1 }, p: 0.5, note: '墨绿的小囊。' },
    spine:  { n: '脊椎', icon: '🦴', st: { str: 1, ter: 2, con: 1 }, p: 0.6, note: '一节一节的骨，中间是空的。' },
    blood:  { n: '血液', icon: '🩸', au: 0.03, tk: { every: 50, kind: 'dust', n: 1 }, p: 1, note: '整具身体里放出来的血，装了满满一瓶。' },
    // R55：残肢（肢体类，战场解剖时可选）。模型：未在编辑器里替换时用占位件（见 limbModel）。
    upperarm: { cat: 'limb', n: '上臂', icon: '💪', st: { str: 2 }, pk: 0.12, p: 0.9, note: '肱二头肌还绷着。戳击加成。' },
    forearm:  { cat: 'limb', n: '前臂', icon: '🤚', st: { agi: 1, str: 1 }, pk: 0.1, r: 3, p: 0.9, note: '细长的两根骨，握过无数次刀柄。戳击加成。' },
    thigh:    { cat: 'limb', n: '大腿', icon: '🦵', st: { con: 2 }, au: 0.05, p: 0.9, note: '全身最粗的一块肌腱与骨。体魄加成，带光环。' },
    calf:     { cat: 'limb', n: '小腿', icon: '🦶', st: { agi: 2 }, tk: { every: 55, kind: 'herb', n: 1 }, p: 0.9, note: '又直又硬的小腿骨。敏捷加成，定时出草药。' },
    piece:    { cat: 'piece', hid: 1, n: '残块', icon: '🥩', note: '解剖台上切下来的一块。' },
    chest:    { cat: 'limb', n: '胸腔', icon: '🦴', st: { con: 2, ter: 1 }, au: 0.07, r: 3.5, p: 0.7, note: '肋骨围成的笼子，里面空了。体魄与胆魄加成，光环范围大。' }
  };
  for (const k in OG) if (!OG[k].cat) OG[k].cat = 'organ';
  const BEAST = ['heart', 'lung', 'liver', 'kidney', 'stomach', 'gut', 'spleen', 'blood', 'thigh', 'calf', 'chest'];
  const LIST = Object.keys(OG); // 就地增长（编辑器新增的自定义部位会 push 进来）
  const poolOf = (human) => (human ? LIST.slice() : BEAST.concat(LIST.filter(k => OG[k].custom && OG[k].beast))).filter(k => !OG[k].hid);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const Sk = () => window.Sack, G_ = () => window.G;

  // ---------------------------------------------------------------- 属性换算
  function grade(og, setN) { return (1 + (og.rar || 0) * 0.45) * (0.75 + (og.q || 0) * 0.5) * (og.af ? 1.15 : 1) * (setN >= 3 ? 1.3 : 1); }
  function effect(og, setN) {
    if (og.t === 'piece' && window.Autopsy) return Autopsy.effect(og, setN);
    const d = OG[og.t]; if (!d) return {}; const g = grade(og, setN || 1), e = {};
    if (d.st) { e.stat = {}; for (const k in d.st) e.stat[k] = Math.round(d.st[k] * g * 10) / 10; }
    if (d.au) e.aura = { r: d.r || 3, m: +(1 + d.au * g).toFixed(3) };
    if (d.pk) e.poke = { r: d.r || 3.5, m: +(1 + d.pk * g).toFixed(3) };
    if (d.tk) e.tick = { every: d.tk.every, kind: d.tk.kind, n: Math.max(1, Math.round(d.tk.n * g)) };
    return e;
  }
  function effText(og, setN) {
    const e = effect(og, setN), a = [];
    if (e.stat) a.push(Object.entries(e.stat).map(([k, v]) => `${SN[k]} +${v}`).join(' '));
    if (e.aura) a.push(`光环 ${e.aura.r}m ×${e.aura.m}`);
    if (e.poke) a.push(`戳击 ${e.poke.r}m ×${e.poke.m}`);
    if (e.tick) a.push(`每 ${e.tick.every}s 产出 ${e.tick.kind === 'coin' ? '🔮魂晶' : (Sk() && Sk().IT[e.tick.kind] ? Sk().IT[e.tick.kind].n : e.tick.kind)} ×${e.tick.n}`);
    return a.join(' · ');
  }
  const dn = (og, d) => og.t === 'piece' ? (og.nm || d.n) : d.n;
  const name = (o) => { const og = o.og, d = og && OG[og.t]; return d ? `${og.own}的${dn(og, d)}` : (o.id || '器官'); };
  const info = (o) => {
    const og = o.og, d = OG[og.t]; if (!d) return '';
    return `归属：${og.own}（${og.race || '?'} · ${RN[og.rar] || RN[0]}${og.age ? ' · ' + og.age + '岁' : ''}）\n`
      + `品质：${Math.round(og.q * 100)}%${og.tr && og.tr.length ? '　性格：' + og.tr.join('、') : ''}${og.af ? '　遗传词缀：' + og.af : ''}\n`
      + `效果（摆成标本）：${effText(og, 1)}\n${og.note || d.note}`;
  };
  const tipHtml = (og, setN, total) => {
    const d = OG[og.t]; return `<b style="color:${RC[og.rar] || '#ddd'}">${d.icon} ${og.own}的${dn(og, d)}</b> · ${og.race || '?'} ${RN[og.rar] || ''} · 品质 ${Math.round(og.q * 100)}%${og.af ? ' · ' + og.af : ''}<br><small>${effText(og, setN)}${setN >= 2 ? ` · 同主 ${setN}/3${setN >= 3 ? ' 套装 ×1.3' : ''}` : ''}</small> · <b>[E]</b> 拿起`;
  };

  // ---------------------------------------------------------------- 物品
  function defs() {
    const S = Sk(); if (!S || !S.def || defs.done) return; defs.done = 1;
    for (const k of LIST) S.def('og_' + k, { n: OG[k].n, icon: OG[k].icon, st: 1, rar: 0, kind: 'organ', w: 1, h: 1, desc: OG[k].note });
  }
  function mkItem(og) { defs(); return Sk().mk('og_' + og.t, 1, { og: JSON.parse(JSON.stringify(og)) }); }

  function canDissect(L) { return on() && L && L.kind === 'corpse' && !L.dissected && (L.fo || L.bst); }
  function dissect(L) {
    const S = Sk(), G = G_(); if (!canDissect(L) || !S) return 0; defs();
    const items = S.itemsOf ? S.itemsOf(L) : (L.items = L.items || []);
    const c = L.fo && L.fo.h && L.fo.h.c, boss = !!(L.fo && (L.fo.boss || L.fo.isBoss));
    let own, race, rar, age, tr, af;
    if (c) { own = c.name; race = c.raceN || c.race; rar = c.rar | 0; age = c.age; tr = (c.traits || []).slice(); const a = window.RPG && c.aff && c.aff[0] && RPG.AFF[c.aff[0]]; af = a ? a.n : ''; }
    else { own = L.bst || '野兽'; race = '野兽'; rar = 0; age = 0; tr = []; af = ''; }
    const pool = poolOf(!!c), got = [];
    const base = clamp(0.3 + rar * 0.08 + (boss ? 0.2 : 0), 0, 0.85);
    for (const t of pool) {
      if (!boss && Math.random() > (OG[t].p || 1) * (c ? 1 : 0.85)) continue;
      const og = { t, own, race, rar, age, tr, af, q: +clamp(base + Math.random() * 0.4, 0.1, 1).toFixed(2), oid: own + '|' + (c ? c.id : 'b') };
      if (t === 'eye') og.iris = Math.floor(Math.random() * 360);
      const it = mkItem(og); items.push(it); got.push(it);
    }
    L.dissected = true;
    if (window.SFX && SFX.play) { try { SFX.play('hit', 0.5, 0.6); } catch (e) { } }
    G && G.toast && G.toast(`🔪 解剖「${own}」：取出 <b>${got.length}</b> 件器官。每件都记着归属。`, '#e88', 3);
    if (G && G.save) G.save();
    return got.length;
  }
  function where(o) { const I = Sk().inv(); for (const L of [I.stash, I.sack.items]) { const i = L.indexOf(o); if (i >= 0) return [L, i]; } return null; }
  function menu(o, wild, rerender) {
    const a = []; if (!o.og) return a;
    if (!wild && window.Props) a.push(['放置为标本（洞内）', () => Props.startPlace('og', o)]);
    a.push(['炼化成魂尘', () => {
      const f = where(o); if (!f) return; f[0].splice(f[1], 1);
      const n = 2 + (o.og.rar | 0) * 3 + Math.round(o.og.q * 3); Sk().stashAdd(Sk().mk('dust', n));
      if ((o.og.rar | 0) >= 3) Sk().stashAdd(Sk().mk('gem', 1));
      G_().toast(`炼化「${name(o)}」→ 魂尘 ×${n}${o.og.rar >= 3 ? ' + 宝石 ×1' : ''}`, '#cfb8ff', 2); rerender && rerender();
    }]);
    return a;
  }

  // ---------------------------------------------------------------- 低多边形器官模型（程序化，见文件头说明）
  const matC = {}, M = (c, o) => { const k = c + (o ? JSON.stringify(o) : ''); return matC[k] || (matC[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.42, metalness: 0.02 }, o || {}))); };
  const add = (g, geo, mat, x, y, z, sx, sy, sz, rx, ry, rz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.scale.set(sx || 1, sy || 1, sz || 1); m.rotation.set(rx || 0, ry || 0, rz || 0); m.userData.ownGeo = true; g.add(m); return m; };
  const sph = (r, s = 14) => new THREE.SphereGeometry(r, s, Math.max(6, s - 4)), cyl = (a, b, h, s = 10) => new THREE.CylinderGeometry(a, b, h, s);
  const tube = (pts, r, seg = 40) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new V3(...p))), seg, r, 8, false);
  function organ(og) {
    const g = new THREE.Group(), t = og.t;
    if (t === 'heart') {
      add(g, sph(0.055), M('#a01822'), 0, 0, 0, 1, 1.15, 0.9); add(g, sph(0.042), M('#871019'), 0.032, 0.022, 0, 1, 1, 0.9);
      add(g, new THREE.ConeGeometry(0.042, 0.065, 12), M('#95141d'), -0.012, -0.065, 0, 1, 1, 0.9, 0, 0, 0.25);
      add(g, cyl(0.014, 0.016, 0.07), M('#c2353f'), 0, 0.075, 0, 1, 1, 1, 0, 0, -0.2); add(g, cyl(0.011, 0.011, 0.06), M('#5a6fb0'), 0.035, 0.07, 0, 1, 1, 1, 0, 0, 0.2); add(g, cyl(0.011, 0.011, 0.05), M('#5a6fb0'), -0.03, 0.06, 0.01, 1, 1, 1, 0, 0, 0.35);
    } else if (t === 'lung') {
      for (const s of [-1, 1]) add(g, sph(0.05), M('#d98a9a', { roughness: 0.6 }), s * 0.048, -0.005, 0, 0.72, 1.35, 0.62, 0, 0, -s * 0.12);
      add(g, cyl(0.01, 0.01, 0.09), M('#e8d8c8'), 0, 0.07, 0); add(g, cyl(0.006, 0.006, 0.05), M('#e8d8c8'), 0.02, 0.03, 0, 1, 1, 1, 0, 0, -0.9); add(g, cyl(0.006, 0.006, 0.05), M('#e8d8c8'), -0.02, 0.03, 0, 1, 1, 1, 0, 0, 0.9);
    } else if (t === 'liver') {
      add(g, sph(0.05), M('#6a2218'), 0, 0, 0, 1.7, 0.8, 1.1, 0, 0, 0.2); add(g, sph(0.03), M('#5c1c14'), -0.055, -0.022, 0.01, 1, 0.9, 1, 0, 0, 0.3); add(g, sph(0.02), M('#4f7a2a'), 0.03, -0.03, 0.035);
    } else if (t === 'kidney') {
      for (const s of [-1, 1]) { add(g, sph(0.04), M('#7a2c2a'), s * 0.045, 0, 0, 0.72, 1.05, 0.55, 0, 0, s * 0.15); add(g, sph(0.012), M('#5a1e1e'), s * 0.02, 0, 0.01); add(g, cyl(0.006, 0.006, 0.07), M('#c2353f'), s * 0.015, 0.0, 0.0, 1, 1, 1, 0, 0, Math.PI / 2); }
    } else if (t === 'stomach') {
      add(g, tube([[0.0, 0.07, 0], [0.01, 0.045, 0], [-0.02, 0.0, 0], [0.0, -0.04, 0.01], [0.04, -0.055, 0.0], [0.07, -0.03, 0]], 0.03), M('#d9877d', { roughness: 0.55 }));
      add(g, tube([[0, 0.12, 0], [0, 0.07, 0]], 0.009), M('#c97a70'));
    } else if (t === 'gut') {
      const pts = []; for (let i = 0; i < 44; i++) { const a = i * 0.75, rr = 0.045 + 0.012 * Math.sin(i * 0.9); pts.push([Math.cos(a) * rr * (1 - i * 0.004), -0.07 + i * 0.0035 + 0.008 * Math.sin(i), Math.sin(a) * rr * (1 - i * 0.004)]); }
      add(g, tube(pts, 0.014, 160), M('#d49a94', { roughness: 0.5 }));
    } else if (t === 'brain') {
      for (const s of [-1, 1]) { const geo = new THREE.IcosahedronGeometry(0.05, 2), p = geo.attributes.position, v = new V3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 140 + v.y * 90) * Math.sin(v.z * 130 + v.x * 60); v.multiplyScalar(1 + n * 0.09); p.setXYZ(i, v.x, v.y, v.z); } geo.computeVertexNormals(); add(g, geo, M('#d8a0a8', { roughness: 0.6 }), s * 0.03, 0.01, 0, 0.72, 0.9, 1.25); }
      add(g, sph(0.027), M('#c08890'), 0, -0.03, -0.045, 1.3, 0.8, 1); add(g, cyl(0.011, 0.009, 0.06), M('#e0c8c0'), 0, -0.055, -0.02, 1, 1, 1, 0.3, 0, 0);
    } else if (t === 'eye') {
      const piv = new THREE.Group(); piv.userData.isEye = true; g.add(piv);
      add(piv, sph(0.04, 18), M('#f2ebe2', { roughness: 0.25 }), 0, 0, 0);
      const ir = new THREE.Color().setHSL((og.iris || 200) / 360, 0.55, 0.42);
      add(piv, new THREE.CircleGeometry(0.019, 20), M('#' + ir.getHexString(), { roughness: 0.2, side: THREE.DoubleSide }), 0, 0, 0.0385);
      add(piv, new THREE.CircleGeometry(0.0085, 14), M('#050505', { side: THREE.DoubleSide }), 0, 0, 0.0392);
      add(piv, cyl(0.007, 0.007, 0.07), M('#d8b0a8'), 0, 0, -0.06, 1, 1, 1, Math.PI / 2, 0, 0);
    } else if (t === 'tongue') {
      add(g, sph(0.03), M('#c4505a'), 0, 0, 0, 1, 0.42, 2.5, 0.25, 0, 0); add(g, sph(0.022), M('#b2434d'), 0, -0.004, -0.06, 1, 0.5, 1.2);
    } else if (t === 'spleen') {
      add(g, sph(0.045), M('#5a1a3a'), 0, 0, 0, 1.15, 0.55, 0.7, 0, 0, 0.3);
    } else if (t === 'gall') {
      add(g, sph(0.03), M('#3f7a2a'), 0, -0.01, 0, 0.9, 1.3, 0.9); add(g, sph(0.018), M('#4a8a30'), 0, 0.035, 0); add(g, cyl(0.005, 0.005, 0.05), M('#3f7a2a'), 0.02, 0.06, 0, 1, 1, 1, 0, 0, -0.6);
    } else if (t === 'spine') {
      for (let i = 0; i < 9; i++) { const y = -0.08 + i * 0.019, z = Math.sin(i * 0.5) * 0.012, sc = 1 - i * 0.03; add(g, cyl(0.02 * sc, 0.022 * sc, 0.014), M('#e6dcc6', { roughness: 0.7 }), 0, y, z); add(g, new THREE.BoxGeometry(0.007, 0.012, 0.022), M('#d8ceb6'), 0, y, z - 0.028 * sc); if (i < 8) add(g, cyl(0.017 * sc, 0.017 * sc, 0.005), M('#7a5a4a'), 0, y + 0.0095, z); }
    }
    return g;
  }
  // 肢体占位件：圆柱 + 关节球（只是占位；在「残肢器官编辑器」里导入自己的模型即可替换）
  function limbModel(og) {
    const g = new THREE.Group(), sk = M('#d9b79c', { roughness: 0.6 }), bn = M('#efe6d2', { roughness: 0.7 }), t = og.t, L = t === 'forearm' ? 0.16 : t === 'calf' ? 0.17 : 0.15, rt = t === 'thigh' ? 0.034 : t === 'chest' ? 0.05 : 0.026;
    if (t === 'chest') { for (let i = 0; i < 5; i++) { const y = -0.06 + i * 0.03; add(g, new THREE.TorusGeometry(0.052 - Math.abs(i - 2) * 0.006, 0.0045, 6, 16), bn, 0, y, 0, 1, 1, 0.8, Math.PI / 2, 0, 0); } add(g, cyl(0.008, 0.008, 0.16), bn, 0, 0, -0.03); }
    else { add(g, cyl(rt, rt * 0.82, L, 12), sk, 0, 0, 0, 1, 1, 1, 0, 0, Math.PI / 2.6); add(g, sph(rt * 1.05), sk, -L * 0.34, -L * 0.2, 0); add(g, sph(rt * 0.9), bn, L * 0.34, L * 0.2, 0); }
    return g;
  }
  function model(og) {
    if (og.t === 'piece' && window.Autopsy) return Autopsy.model(og); // R55：解剖台切下的块——直接展示，不带标本罐
    const cm0 = null;
    const g = new THREE.Group(), blood = og.t === 'blood', rc = new THREE.Color(RC[og.rar] || '#999');
    const brass = M('#8a6a3a', { metalness: 0.7, roughness: 0.35 });
    add(g, cyl(0.12, 0.125, 0.03, 20), brass, 0, 0.015, 0);
    add(g, cyl(0.11, 0.11, 0.29, 22), M('#cfe0dd', { transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false }), 0, 0.175, 0);
    add(g, cyl(0.1, 0.1, 0.25, 22), M(blood ? '#6a0a10' : '#b9c88a', { transparent: true, opacity: blood ? 0.78 : 0.3, roughness: 0.2, depthWrite: false }), 0, 0.165, 0);
    add(g, cyl(0.115, 0.115, 0.028, 20), brass, 0, 0.335, 0); add(g, cyl(0.03, 0.03, 0.03, 10), M('#' + rc.getHexString(), { emissive: '#' + rc.getHexString(), emissiveIntensity: 0.6 }), 0, 0.36, 0);
    add(g, new THREE.BoxGeometry(0.075, 0.045, 0.004), M('#d8c9a4', { roughness: 0.9 }), 0, 0.06, 0.113);
    if (blood) { for (let i = 0; i < 9; i++) add(g, sph(0.008 + (i % 3) * 0.003, 6), M('#9a1a20', { transparent: true, opacity: 0.6 }), Math.cos(i * 2.1) * 0.05, 0.1 + i * 0.022, Math.sin(i * 2.1) * 0.05); }
    else { const cm = cm0; const d0 = OG[og.t] || {}; const o = cm ? cm : (d0.cat === 'limb' ? limbModel(og) : organ(og)); o.position.y = 0.18; if (!cm) o.scale.setScalar(1.3); g.add(o); }
    const bb = new THREE.Box3().setFromObject(g); g.userData.ext = bb.getSize(new V3());
    return g;
  }
  // 眼球追着玩家转（每帧）
  function tick() {
    const P = window.Props, G = G_(); if (!P || !P.items || !G || !G.camera) return; let cp = null;
    for (const it of P.items) {
      if (it.ghost || !it.p || it.p.t !== 'og' || it.p.og.t !== 'eye') continue;
      if (it.eye === undefined) { it.eye = null; it.g.traverse(o => { if (o.userData && o.userData.isEye) it.eye = o; }); }
      if (!it.eye) continue; cp = cp || G.camera.getWorldPosition(new V3()); it.eye.parent.updateWorldMatrix(true, false); it.eye.lookAt(cp);
    }
  }
  let ti = setInterval(() => { const G = G_(); if (!G || !G.HOOK || !Sk()) return; clearInterval(ti); defs(); G.HOOK.frame.push(tick); }, 400);

  return { on, OG, LIST, poolOf, limbModel, organPreview: (t) => organ({ t, rar: 0, iris: 200 }), defsNow: () => { defs.done = 0; defs(); }, RN, RC, effect, effText, name, info, tipHtml, mkItem, canDissect, dissect, menu, model, defs, grade };
})();
