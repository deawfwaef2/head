// R69 MOD soul_siphon（默认开）：F 回忆里的「汲魂」——无尽节奏 + 蒙太奇镜头（重做 R68 初版）。
//  · 左手扣住首级头顶（手指顺着头骨弯下去），右手攥紧粗木棒（手指绕棒），从嘴里（口汲）或断颈（颈汲）一下下捅进去，把残魂拧出来。每颗头只能汲一次；成年（≥18 岁）才行。
//  · 只用空格：音符从轨道两侧流向中心环——单拍 / 双拍 / 反拍 / 重捅 / 长抽（按住→末端松开）/ 狂搅（连打）/ 忍住（红✕别按）/ 三连 / 切分 / 奔马 / 回响（凭记忆）/ 缠斗 / 连捅 / 暴雨。
//  · 无尽：每 8 拍一段，段段加速、没有上限；每 6 段一次「喘息」。50 连击倍率 ×2，每 40 连击「魂潮」8 拍 ×1.6。
//    失误让魂压上涨，爆表＝残魂炸开（只拿 70%）；Esc / F 随时收手（拿 100%）。残魂有限：每下拧出剩余的 2.2%，魂晶天花板 ≈ 残魂 ×2。
//  · 镜头蒙太奇：多机位跟拍硬切，越快切得越勤；表情在原表情上渐变，越深越翻白眼、吐舌、抽搐；生前记忆按段闪回。
// 依赖：RecallIW（pre 每帧调 Siphon.frame 接管相机 / 首级 / 手）、ModelHeads、Assets（limb_hand）、SFX。
window.Siphon = (() => {
  'use strict';
  const on = () => !window.Mods || Mods.on('soul_siphon');
  const PI = Math.PI, V3 = THREE.Vector3, Q4 = THREE.Quaternion;
  const cl = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k, sm = x => x * x * (3 - 2 * x), eo = x => 1 - Math.pow(1 - x, 3);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pk = a => a[Math.floor(Math.random() * a.length) % a.length];
  const COL = ['#dfe6f0', '#6fb8ff', '#c47cff', '#ffc84a', '#ff5f9e'], EFN = ['白烟', '蓝焰', '紫电', '金辉', '血月光'], RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'], MN = { m: '口汲', n: '颈汲' };
  let Z = null, root = null, cssOn = false;

  // ---------------- 规则 ----------------
  const ageOf = c => +(c && c.age) || 0;
  function can(rec) {
    const c = rec && rec.c; if (!on()) return { ok: false, why: '汲魂已关闭' };
    if (!c) return { ok: false, why: '她没有魂可汲' }; if (c.sip) return { ok: false, why: '她的残魂已经被你榨干了' };
    if (ageOf(c) < 18) return { ok: false, why: '她还没成年——食人魔也有不碰的东西' };
    return { ok: true };
  }
  const SOUL = [60, 120, 210, 360, 600], BPM0 = [76, 80, 86, 92, 100];
  function cfg(c) {
    const r = cl(c.rar | 0, 0, 4);
    return { r, soul: Math.round(SOUL[r] * (c.shiny ? 1.3 : 1)), bpm0: BPM0[r], grow: 1.05 + 0.004 * r, p: 0.022, keep: 0.7, stars: r + 1,
      win: { p: 0.05 - 0.003 * r, g: 0.095 - 0.005 * r, o: 0.15 - 0.008 * r }, missP: 0.16 + 0.02 * r };
  }

  // ---------------- 谱面：8 拍一段，按段位解锁段型 ----------------
  const Tn = (b, o) => Object.assign({ k: 'tap', b }, o || {}), Hn = b => ({ k: 'heavy', b }), On = b => ({ k: 'off', b }), Xn = b => ({ k: 'ghost', b }), Ln = (b, e) => ({ k: 'hold', b, e }), Mn = (b, e) => ({ k: 'mash', b, e });
  const ECHO = [[0, 1, 1.5, 3], [0, 0.5, 1, 2, 3], [0, 1, 2, 2.5, 3], [0, 0.75, 1.5, 2, 3], [0, 1.5, 2, 3, 3.5]];
  const PH = [
    { id: 'march', lv: 0, w: 3, n: '稳拍', f: () => [0, 1, 2, 3, 4, 5, 6, 7].map(b => Tn(b)) },
    { id: 'pulse', lv: 0, w: 2, n: '缓抽', f: () => [Tn(0), Tn(2), Tn(3), Tn(4), Tn(6), Hn(7)] },
    { id: 'pair', lv: 1, w: 3, n: '双拍', f: () => [Tn(0), Tn(1), Tn(2), Tn(2.5), Tn(4), Tn(5), Tn(6), Tn(6.5)] },
    { id: 'drag', lv: 2, w: 2, n: '长抽', tip: '按住空格，在长条末端松开', f: () => [Ln(0, 2), Tn(3), Ln(4, 6), Hn(7)] },
    { id: 'off', lv: 2, w: 2, n: '反拍', tip: '空心的拍子落在两拍之间', f: () => [Tn(0), On(1.5), Tn(2), On(3.5), Tn(4), On(5.5), Tn(6), On(7.5)] },
    { id: 'accent', lv: 2, w: 2, n: '重捅', tip: '金色大拍：一下顶两下', f: () => [Tn(0), Tn(1), Tn(2), Hn(3), Tn(4), Tn(5), Tn(6), Hn(7)] },
    { id: 'mash', lv: 3, w: 2, n: '狂搅', tip: '橙色区间里连按空格，按够数', f: () => [Tn(0), Tn(1), Tn(2), Tn(3), Mn(4, 7.25)] },
    { id: 'bait', lv: 3, w: 2, n: '忍住', tip: '红✕是她咬紧牙关——别按', f: () => [Tn(0), Tn(1), Xn(2), Tn(3), Tn(4), Xn(5), Tn(6), Tn(7)] },
    { id: 'trip', lv: 4, w: 2, n: '三连', f: () => [Tn(0), Tn(1), Tn(2), Tn(2 + 1 / 3), Tn(2 + 2 / 3), Tn(4), Tn(5), Tn(6), Tn(6 + 1 / 3), Tn(6 + 2 / 3)] },
    { id: 'sync', lv: 4, w: 2, n: '切分', f: () => [Tn(0), Tn(0.75), Tn(1.5), Tn(2), Tn(3), Tn(3.75), Tn(4.5), Tn(5), Tn(6), Hn(7)] },
    { id: 'gallop', lv: 5, w: 2, n: '奔马', f: () => [Tn(0), Tn(0.5), Tn(0.75), Tn(2), Tn(2.5), Tn(2.75), Tn(4), Tn(4.5), Tn(4.75), Tn(6), Hn(7)] },
    { id: 'echo', lv: 5, w: 2, n: '回响', tip: '记住前半段，后半段看不见——凭记忆敲回去', f: () => { const p = pk(ECHO); return p.map(b => Tn(b)).concat(p.map(b => Tn(b + 4, { hid: 1 }))); } },
    { id: 'tangle', lv: 6, w: 2, n: '缠斗', f: () => [Ln(0, 1.5), Tn(2), Tn(2.5), Xn(3), Hn(3.5), Tn(4), On(4.5), Tn(5), Mn(5.5, 7.25)] },
    { id: 'roll', lv: 6, w: 2, n: '连捅', f: () => [Tn(0), Tn(1), Tn(2), Tn(2.25), Tn(2.5), Tn(2.75), Tn(4), Tn(5), Tn(6), Tn(6.25), Tn(6.5), Tn(6.75)] },
    { id: 'storm', lv: 7, w: 1, n: '暴雨', f: () => Array.from({ length: 16 }, (_, i) => i % 8 === 7 ? Hn(i / 2) : Tn(i / 2)) }
  ];
  const BREATH = { id: 'breath', n: '喘息', tip: '慢下来——长长地拉', f: () => [Ln(0, 3), Tn(4), Tn(5), Ln(6, 7.5)] };
  const PRESS = { tap: 1, heavy: 1, off: 1, ghost: 1, hold: 1 };
  function phrase(k) {
    const C = Z.C, lv = k + C.r, b0 = Z.b0 + 8 * k, prev = Z.phr[Z.phr.length - 1], breath = k >= 5 && k % 6 === 5;
    const bpm = !prev ? C.bpm0 : prev.bpm * (breath ? 1 : C.grow);
    let P = PH[0];
    if (breath) P = BREATH;
    else if (k > 0) {
      const pool = PH.filter(p => p.lv <= lv && p.id !== Z.lastPh), wt = p => p.w * (p.lv >= lv - 2 ? 1.7 : 1); let x = Math.random() * pool.reduce((s, p) => s + wt(p), 0);
      for (const p of pool) { x -= wt(p); if (x <= 0) { P = p; break; } }
    }
    Z.lastPh = P.id; const spb = 60 / bpm;
    const L = P.f().map(n => Object.assign(n, { b: b0 + n.b, e: n.e != null ? b0 + n.e : undefined, spb, ph: k }));
    for (const n of L) if (n.k === 'mash') { n.need = Math.max(4, Math.round((n.e - n.b) * spb * (4.6 + 0.3 * Math.min(12, lv)))); n.cnt = 0; }
    L.sort((a, b) => a.b - b.b); Z.notes.push(...L);
    Z.phr.push({ k, b: b0, bpm, id: P.id, n: P.n, tip: P.tip, breath, first: !Z.seenPh[P.id] }); Z.seenPh[P.id] = 1;
  }

  // ---------------- 文案 ----------------
  const BIO = c => { try { return (window.Overhear && Overhear.bio && Overhear.bio(c)) || {}; } catch (e) { return {}; } };
  function memories(c) {
    const b = BIO(c), g = c.goal || '把日子过好', L = c.locN || '故乡', nm = c.name || '她', like = b.like || '晒过太阳的干草', quirk = b.quirk || '数星星', bel = c.belief || '神明';
    const W = [`「${g}」——她曾在${L}的灯下，把这句话讲给最小的弟妹听，一屋子的人都笑了。`, `出门那天清早，母亲替她理好衣领：“这次也要平安回来。”她回头挥手：“当然，我答应你。”`, `她有个小习惯：${quirk}。家里人都笑她，却又都惯着她。`, `她最喜欢${like}。那天的${like}，是她这辈子最亮的一个下午。`, `父亲把一枚旧护符塞进她手心：“不管走到哪，别逞强。”她点点头，把它缝进了衣襟。`, `她信${bel}。夜里跪在窗前，替每一个她爱的人轻声念了一遍。`, `同伴递给她半块干饼：“活着回来，我请你喝酒。”她笑着应了。`];
    const K = [`而现在，她的舌头软软地垂在木棒边，再也说不出一个字。`, `衣领还整整齐齐。没有人会告诉那位母亲，这一次，她回不去了。`, `那枚护符不知落在了哪条路边的泥里。`, `「${g}」——如今只剩下一点余温，被你一缕缕从她魂里拧出来。`, `${L}的门口还点着灯。等的人，还不知道。`, `${nm}的睫毛抖了一下。那不是活人的颤。`, `那杯酒，没有人去喝了。`];
    const idx = W.map((_, i) => i).sort(() => Math.random() - 0.5); return idx.map((w, i) => ({ w: W[w], k: K[(w + i) % K.length] }));
  }
  const SENS = {
    start: { m: ['你把木棒细的一端抵上去。木头是湿的，带着洞里的凉气，和一点没洗净的血腥味。', '她的牙齿轻轻磕在木头上，咯、咯。'], n: ['你把木棒对准那圈湿冷的断面。凝住的血被顶开，一股温热涌了出来。', '断面的肌肉在木头下轻轻抽动，像在抗拒。'] },
    hit: { m: ['木棒碾过齿列，发出潮湿的、骨头一样的吱嘎声。', '涎液顺着棒身淌到你的虎口，冰凉。', '每推进一寸，她的下颌就被撑开一寸——骨节轻轻响。', '棒子拔出来的时候，带出一缕白雾，雾里有她的体温。'], n: ['颅腔里传来空洞的回响，像在敲一口封了很久的瓮。', '木头刮过断面，湿冷的肉发出细碎的声响。', '血被棒身带出来，温的，黏的，顺着你的手腕往下爬。', '她的头在你掌心里颤了一下——是残魂被拧动时的反射。'] },
    soul: ['一缕缕白烟从她眼角、嘴角被拉出来，缠上木棒，烫得你手心发麻。', '残魂的味道像烧焦的蜂蜜混着铁锈。', '你听见很细的一声叹息，不属于任何活着的东西。', '烟丝在木头上拧成一股，往你的指缝里钻。'],
    spasm: ['她的眼珠向上翻去，只剩两弯青白；另一只却往下沉，像两个互不认识的魂。', '舌尖垂出来，轻轻晃，像风里的一片叶子。', '她的脸在你手里抽了一下——很轻，却是整张脸一起。'],
    miss: ['木棒猛地卡住，震得你手腕发麻。她的牙关咬死了木头。', '节奏断了。残魂缩回深处，像受惊的鱼。', '木头在她骨缝里别了一下，吱——一声长长的刮响。'],
    drag: ['你把木棒一寸寸往外拖，她的魂被拉成一根发亮的细丝。', '慢一点——魂丝绷得笔直，像要断，又没断。'],
    mash: ['连着搅，连着搅——木棒磨得发烫，她的脸在火光里一明一暗。', '木头在里面打转，魂烟一团团往外涌。'],
    bait: ['她的牙关忽然一紧——红色的拍子别动，等它过去。', '别急。她在咬，你一动，木棒就卡死。'],
    echo: ['她的头在你手里跳了几下，像在敲一段暗号——记住它，再敲回去。'],
    breath: ['你放慢了手。魂丝很长，很长，一直连到她再也想不起来的地方。'],
    fever: ['魂潮——她的魂整个松开了，一股股往外涌！', '木棒烫得握不住，魂光把整张脸照透了。'],
    danger: ['她的魂在里面鼓胀，越压越紧——再错一下就要炸开。', '魂压快满了，木头在她骨缝里咯吱作响。'],
    faster: ['节奏又快了一截。', '你的手越来越快，她的头在掌心里一下下颤。', '快。再快。'],
    stop: ['你把木棒抽了出来，带出最后一缕没散的魂烟。'],
    burst: ['魂压爆了——残魂被挤碎，魂晶像碎玻璃一样从她七窍里迸出来！'],
    end: ['她的脸像被掏空的陶器，安静得过分。', '木棒从她身体里抽出来，带出一声湿漉漉的、空空的回响。']
  };

  // ---------------- 木棒：车削轮廓（嘴里那段细，握把粗）+ 木纹 / 符文贴图 ----------------
  const CL = { L: 0.44, G: 0.24, P: [[0, 0.004], [0.012, 0.0072], [0.035, 0.0108], [0.06, 0.0136], [0.085, 0.0152], [0.098, 0.0146], [0.108, 0.0162], [0.125, 0.0158], [0.15, 0.0166], [0.2, 0.0186], [0.25, 0.021], [0.29, 0.0228], [0.36, 0.0236], [0.41, 0.0248], [0.44, 0.0252]] };
  function radAt(s) { const P = CL.P; if (s <= 0) return P[0][1]; for (let i = 1; i < P.length; i++) if (s <= P[i][0]) { const a = P[i - 1], b = P[i]; return lerp(a[1], b[1], (s - a[0]) / (b[0] - a[0])); } return P[P.length - 1][1]; }
  let TEX = null;
  function clubTex() {
    if (TEX) return TEX; const W = 128, H = 512, rnd = Math.random;
    const a = document.createElement('canvas'); a.width = W; a.height = H; const x = a.getContext('2d');
    const gr = x.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, '#4a140f'); gr.addColorStop(0.16, '#6b3320'); gr.addColorStop(0.32, '#8a5a34'); gr.addColorStop(0.6, '#7a4a2a'); gr.addColorStop(0.64, '#3a2216'); gr.addColorStop(1, '#2a1810');
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 180; i++) { const u = rnd() * W, y0 = rnd() * H, len = 40 + rnd() * 200; x.strokeStyle = rnd() < 0.55 ? `rgba(28,14,6,${0.1 + rnd() * 0.18})` : `rgba(170,120,76,${0.06 + rnd() * 0.1})`; x.lineWidth = 0.6 + rnd() * 1.8; x.beginPath(); x.moveTo(u, y0); x.bezierCurveTo(u + (rnd() - 0.5) * 10, y0 + len * 0.33, u + (rnd() - 0.5) * 10, y0 + len * 0.66, u + (rnd() - 0.5) * 6, y0 + len); x.stroke(); }
    for (let i = 0; i < 6; i++) { const u = rnd() * W, v = H * (0.4 + rnd() * 0.35); x.fillStyle = 'rgba(30,14,6,.55)'; x.beginPath(); x.ellipse(u, v, 4 + rnd() * 4, 7 + rnd() * 6, 0, 0, PI * 2); x.fill(); x.strokeStyle = 'rgba(150,96,56,.35)'; x.lineWidth = 1.2; x.stroke(); }
    for (let v = H * 0.04; v < H * 0.33; v += 9) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, v, W, 3); }
    x.fillStyle = 'rgba(90,10,10,.5)'; for (let i = 0; i < 40; i++) { const v = H - rnd() * H * 0.3; x.fillRect(rnd() * W, v, 2 + rnd() * 6, 2 + rnd() * 20); }
    const b = document.createElement('canvas'); b.width = W; b.height = H; const y = b.getContext('2d'); y.fillStyle = '#000'; y.fillRect(0, 0, W, H);
    y.strokeStyle = '#fff'; y.lineCap = 'round'; y.shadowColor = '#fff'; y.shadowBlur = 4;
    for (let i = 0; i < 26; i++) { const u = rnd() * W, v = H * (0.38 + rnd() * 0.5), s = 6 + rnd() * 9; y.lineWidth = 1.4 + rnd(); y.beginPath(); y.moveTo(u, v); y.lineTo(u + (rnd() - 0.5) * s, v - s); y.lineTo(u + (rnd() - 0.5) * s * 1.4, v - s * 1.8); if (rnd() < 0.5) { y.moveTo(u - s * 0.4, v - s * 0.9); y.lineTo(u + s * 0.4, v - s * 0.9); } y.stroke(); }
    for (let k = 0; k < 2; k++) { y.lineWidth = 1.2; y.beginPath(); for (let v = H * 0.4; v < H * 0.92; v += 2) { const u = ((v * 0.9 + k * W / 2) % W); y.lineTo(u, v); } y.stroke(); }
    const wood = new THREE.CanvasTexture(a), rune = new THREE.CanvasTexture(b); wood.encoding = THREE.sRGBEncoding; wood.wrapS = rune.wrapS = THREE.RepeatWrapping;
    TEX = { wood, rune }; return TEX;
  }
  function buildClub(ws, col) {
    const pts = [new THREE.Vector2(0.0001, -0.003 * ws)], N = 96;
    for (let i = 0; i <= N; i++) { const s = CL.L * i / N, r = radAt(s) * ws * (1 + 0.035 * Math.sin(s * 140) + 0.02 * Math.sin(s * 377)); pts.push(new THREE.Vector2(r, s * ws)); }
    pts.push(new THREE.Vector2(0.0001, CL.L * ws));
    const T = clubTex(), mat = new THREE.MeshStandardMaterial({ map: T.wood, emissiveMap: T.rune, emissive: new THREE.Color(col), emissiveIntensity: 0.15, roughness: 0.8, metalness: 0 });
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 26), mat); m.frustumCulled = false; m.renderOrder = 3; return m;
  }

  // ---------------- 手：limb_hand 模型按「弯曲」变形 → 握拳（攥棒）/ 爪扣（扣头顶）----------------
  // 手框架：腕在原点、手指朝 -Z、掌心朝 -Y；未镜像时拇指在 +X（解剖学左手），镜像后是右手。
  const HAND = ['limb_hand_avatar', 'limb_hand_jean', 'limb_hand_amber', 'limb_hand_mona'];
  function handGeos(mirror, k) {
    const A = window.Assets, nm = HAND.find(n => A && A.has && A.has(n)); if (!nm) return null;
    const src = A.clone(nm), w = new THREE.Group(), s = 1.55 * k; w.add(src); w.scale.set(mirror ? -s : s, s, s); w.updateMatrixWorld(true);
    const out = []; src.traverse(m => { if (m.isMesh && m.geometry) { const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); if (!g.attributes.normal) g.computeVertexNormals(); out.push({ g, cut: /cut/i.test(m.name) }); } });
    let zMin = 0; for (const o of out) { const p = o.g.attributes.position; for (let i = 0; i < p.count; i++) zMin = Math.min(zMin, p.getZ(i)); }
    const z0 = zMin * 0.53; let xa = 9, xb = -9, ya = 9, yb = -9, ys = 0, n = 0;
    for (const o of out) { if (o.cut) continue; const p = o.g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z > z0 * 1.15 || z < zMin * 0.92) continue; const x = p.getX(i), y = p.getY(i); xa = Math.min(xa, x); xb = Math.max(xb, x); ya = Math.min(ya, y); yb = Math.max(yb, y); ys += y; n++; } }
    return { out, mirror, k, zMin, z0, xc: (xa + xb) / 2, xs: [xa, xb], yf: n ? ys / n : 0, ft: n ? (yb - ya) / 2 : 0.012 * k };
  }
  function bend(st, o) { // 绕平行于 X 的轴（y=o.yc, z=o.z0）把 z<o.z0 的部分卷向掌心；o.thumb：拇指（指幅外侧）保持伸直
    const k = st.k, am = o.maxA || 4.2;
    for (const it of st.out) {
      const P = it.g.attributes.position, N = it.g.attributes.normal;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i), s = o.z0 - z; if (s <= 0) continue;
        let w = 1; if (o.thumb) { const tx = st.mirror ? -x : x, edge = st.mirror ? -st.xs[0] : st.xs[1]; w = 1 - sm(cl((tx - edge + 0.004 * k) / (0.018 * k), 0, 1)); }
        let th = s / o.R * w, ex = s * (1 - w); if (th > am) { ex += (th - am) * o.R; th = am; }
        const c = Math.cos(th), sn = Math.sin(th), dy = y - o.yc;
        P.setXYZ(i, x, o.yc + dy * c - sn * ex, o.z0 - dy * sn - c * ex);
        if (N) { const ny = N.getY(i), nz = N.getZ(i); N.setXYZ(i, N.getX(i), ny * c + nz * sn, -ny * sn + nz * c); }
      }
      P.needsUpdate = true; if (N) N.needsUpdate = true; it.g.computeBoundingSphere();
    }
  }
  function mkHand(st, skin, dark) { const g = new THREE.Group(); for (const it of st.out) { const m = new THREE.Mesh(it.g, it.cut ? dark : skin); m.frustumCulled = false; m.renderOrder = 2; g.add(m); } g.matrixAutoUpdate = false; return g; }
  function seg(r0, r1, mat) { const geo = new THREE.CylinderGeometry(r1, r0, 1, 14, 1, false); geo.translate(0, 0.5, 0); const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; return m; }
  function ball(r, mat) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat); m.frustumCulled = false; return m; }

  // ---------------- UI：电影黑边 + 顶部 HUD + 底部节拍轨（canvas）----------------
  const CSS = `#riw .sp{position:absolute;inset:0;pointer-events:none;display:none;--c:#ffc84a;font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif}
#riw.sipon .sp{display:block}#riw.sipon .rcard,#riw.sipon .rbar,#riw.sipon .hint,#riw.sipon .x,#riw.sipon .pn,#riw.sipon .vg,#riw.sipon .pr,#riw.sipon .tipb{display:none!important}
#riw.sipon .sub{bottom:calc(15vh + 12px);font-size:15px}
#riw .sp .vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 46%,transparent 40%,var(--vc,#000) 150%);opacity:.5}
#riw .sp .lbx{position:absolute;left:0;right:0;background:#050304;transition:transform .8s cubic-bezier(.2,.8,.2,1)}
#riw .sp .lbx.lbt{top:0;height:8vh;transform:translateY(-101%);border-bottom:1px solid rgba(255,210,140,.12)}#riw .sp .lbx.lbb{bottom:0;height:15vh;transform:translateY(101%);border-top:1px solid rgba(255,210,140,.12)}#riw .sp.in .lbx{transform:none}
#riw .sp .hud{position:absolute;left:0;right:0;top:0;height:8vh;display:flex;align-items:center;justify-content:space-between;padding:0 2.4vw;color:#cdbfa8;opacity:0;transition:opacity .6s .3s}
#riw .sp.in .hud,#riw .sp.in .ln,#riw .sp.in .ky,#riw .sp.in .sbar{opacity:1}
#riw .sp .hl{display:flex;gap:12px;align-items:baseline;font-size:13px;letter-spacing:.12em;min-width:28vw}#riw .sp .hl .md{font:800 17px serif;letter-spacing:.3em;color:var(--c)}#riw .sp .hl .pn2{color:#9a8a78}
#riw .sp .pool{position:relative;display:flex;align-items:center;gap:8px}#riw .sp .pool i{font-style:normal;font-size:22px;filter:drop-shadow(0 0 6px var(--c))}
#riw .sp .pool b{font:900 34px/1 Consolas,'SF Mono',monospace;color:#ffe9b0;text-shadow:0 0 14px rgba(255,200,90,.55);min-width:2ch}#riw .sp .pool b.bump{animation:spB .22s}@keyframes spB{40%{transform:scale(1.18)}}
#riw .sp .gf{position:absolute;left:100%;top:0;width:0;height:0}#riw .sp .gf span{position:absolute;left:8px;top:-4px;font:800 15px monospace;color:#ffe28a;white-space:nowrap;animation:spG .9s forwards;text-shadow:0 0 8px #000}@keyframes spG{0%{opacity:0;transform:translateY(10px)}20%{opacity:1}100%{opacity:0;transform:translateY(-22px)}}
#riw .sp .hr{display:flex;gap:16px;align-items:baseline;justify-content:flex-end;min-width:28vw;font-size:13px}#riw .sp .hr .bpm{display:inline-block;font:800 18px monospace;color:#ffd9a0}#riw .sp .hr .bpm.up{animation:spUp .6s}@keyframes spUp{30%{color:#fff;transform:scale(1.25)}}#riw .sp .hr .sl{color:#bba88f}
#riw .sp .sbar{position:absolute;left:0;right:0;top:8vh;height:3px;background:rgba(255,255,255,.06);opacity:0;transition:opacity .6s}#riw .sp .sbar i{position:absolute;left:0;top:0;bottom:0;width:100%;background:linear-gradient(90deg,transparent,var(--c));box-shadow:0 0 10px var(--c);transition:width .25s}
#riw .sp .ln{position:absolute;left:50%;bottom:calc(7.5vh - 40px);width:min(860px,60vw);height:80px;transform:translateX(-50%);opacity:0;transition:opacity .6s .4s}#riw .sp .cv{width:100%;height:100%;display:block}
#riw .sp .cb{position:absolute;right:calc(100% + 14px);top:50%;transform:translateY(-50%);text-align:right;line-height:1}#riw .sp .cb b{display:block;font:900 38px/1 Consolas,monospace;color:#fff;text-shadow:0 0 12px var(--c)}#riw .sp .cb small{font-size:12px;letter-spacing:.3em;color:#bba88f}#riw .sp .cb.pop b{animation:spC .25s}@keyframes spC{40%{transform:scale(1.3)}}
#riw .sp .mu{position:absolute;left:calc(100% + 14px);top:50%;transform:translateY(-50%);line-height:1.15;white-space:nowrap}#riw .sp .mu b{display:block;font:800 22px monospace;color:#ffd27a}#riw .sp .mu small{font-size:12px;color:#ffb070;letter-spacing:.12em}
#riw .sp .jg{position:absolute;left:50%;bottom:100%;transform:translateX(-50%);font:900 30px/1 serif;letter-spacing:.2em;white-space:nowrap;opacity:0;text-shadow:0 2px 10px #000,0 0 18px currentColor}#riw .sp .jg.go{animation:spJ .55s ease-out}@keyframes spJ{0%{opacity:1;transform:translate(-50%,8px) scale(1.45)}25%{transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-16px) scale(.96)}}
#riw .sp .ky{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);font-size:12px;color:#8a7a68;letter-spacing:.08em;opacity:0;transition:opacity .6s;white-space:nowrap}#riw .sp .ky kbd{padding:0 6px;border:1px solid #6a5a48;border-bottom-width:2px;border-radius:3px;color:#e8d0a0;font:11px monospace}
#riw .sp .bn{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);text-align:center;opacity:0;white-space:nowrap}#riw .sp .bn b{display:block;font:900 52px/1.1 serif;letter-spacing:.3em;color:#fff;text-shadow:0 0 24px var(--bc,var(--c)),0 4px 14px #000}#riw .sp .bn small{display:block;margin-top:8px;font:600 16px system-ui;letter-spacing:.12em;color:#f0dcc0;text-shadow:0 2px 8px #000}
#riw .sp .bn.go{animation:spN var(--bd,1.4s) ease-out forwards}@keyframes spN{0%{opacity:0;transform:translate(-50%,-50%) scale(1.5)}12%{opacity:1;transform:translate(-50%,-50%) scale(1)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(.97)}}
#riw .sp .mm{position:absolute;left:50%;top:12vh;transform:translateX(-50%);width:min(720px,72vw);text-align:center;opacity:0;transition:opacity 1s}#riw .sp .mm.on{opacity:1}#riw .sp .mm .w{font:italic 19px/1.75 serif;color:#f6e9d0;text-shadow:0 2px 10px #000,0 0 30px rgba(255,220,160,.25)}#riw .sp .mm .k{margin-top:8px;font:700 16px/1.6 serif;color:#ff6a6a;letter-spacing:.06em;opacity:0;transition:opacity 1s 1.6s;text-shadow:0 2px 8px #000}#riw .sp .mm.on .k{opacity:1}
#riw .sp .fl{position:absolute;inset:0;background:#fff;opacity:0}
#riw .sp .rs{position:absolute;left:50%;top:46%;width:min(520px,86vw);transform:translate(-50%,-50%) scale(.92);padding:22px 30px 18px;text-align:center;background:linear-gradient(180deg,rgba(20,12,14,.94),rgba(8,5,6,.96));border:1px solid var(--c);border-radius:14px;box-shadow:0 0 50px rgba(0,0,0,.8),0 0 30px var(--c);opacity:0;transition:opacity .5s,transform .5s;pointer-events:none;color:#efe4d4}#riw .sp .rs.on{opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:auto}
#riw .sp .rs .gd{font:900 76px/1 serif;color:var(--c);text-shadow:0 0 30px var(--c)}#riw .sp .rs h2{margin:4px 0 2px;font:800 22px serif;letter-spacing:.3em;color:#f4e6cc}#riw .sp .rs .n{margin:8px 0;font:900 46px/1 monospace;color:#ffe28a;text-shadow:0 0 18px rgba(255,200,90,.6)}#riw .sp .rs .n small{font-size:15px;color:#c9a870;margin-left:8px}
#riw .sp .rs .st{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0 6px;font-size:12px;color:#a89886}#riw .sp .rs .st b{display:block;font:800 18px monospace;color:#f0e2c8}#riw .sp .rs p{margin:6px 0 0;font-size:13px;color:#d8c8b0;line-height:1.6}#riw .sp .rs .x2{margin-top:10px;font-size:12px;color:#8a7a68}`;
  function ui() {
    if (!cssOn) { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); cssOn = true; }
    const host = document.getElementById('riw'); if (!host) return null; if (root && root.isConnected) return root;
    root = document.createElement('div'); root.className = 'sp';
    root.innerHTML = `<div class="vig"></div><div class="lbx lbt"></div><div class="lbx lbb"></div>
<div class="hud"><div class="hl"><b class="md"></b><span class="rn"></span><span class="pn2"></span></div><div class="pool"><i>🔮</i><b>0</b><div class="gf"></div></div><div class="hr"><span class="bpm"></span><span class="sl"></span></div></div><div class="sbar"><i></i></div>
<div class="bn"><b></b><small></small></div><div class="mm"><div class="w"></div><div class="k"></div></div>
<div class="ln"><canvas class="cv"></canvas><div class="cb"><b>0</b><small>连击</small></div><div class="mu"><b>×1.00</b><small></small></div><div class="jg"></div></div>
<div class="ky"><kbd>空格</kbd> 踩拍　<kbd>Esc</kbd> / <kbd>F</kbd> 收手（拿走全部）</div><div class="rs"></div><div class="fl"></div>`;
    host.appendChild(root); return root;
  }
  const q = s => root.querySelector(s);
  function bindEl() { Z.el = { pool: q('.pool b'), gf: q('.gf'), pn: q('.pn2'), md: q('.md'), rn: q('.rn'), bpm: q('.bpm'), sl: q('.sl'), sbar: q('.sbar i'), cb: q('.cb'), cbN: q('.cb b'), mu: q('.mu b'), mus: q('.mu small'), jg: q('.jg'), bn: q('.bn'), mm: q('.mm'), fl: q('.fl'), rs: q('.rs'), vig: q('.vig'), cv: q('.cv') }; Z.cv = Z.el.cv; Z.g2 = Z.cv.getContext('2d'); Z.hc = {}; }
  function hud() {
    const E = Z.el, set = (k, el, v) => { if (Z.hc[k] === v) return false; Z.hc[k] = v; el.innerHTML = v; return true; };
    const P = Math.round(Z.pool); if (set('pool', E.pool, String(P)) && P > 0) { E.pool.classList.remove('bump'); void E.pool.offsetWidth; E.pool.classList.add('bump'); }
    set('pn', E.pn, Z.cur ? `第 ${Z.k + 1} 段 · ${esc(Z.cur.n)}` : '起拍'); set('sl', E.sl, `残魂 ${Math.round(Z.res / Z.C.soul * 100)}%`);
    if (set('bpm', E.bpm, `♩ ${Math.round(Z.bpm)}`) && Z.k > 0) { E.bpm.classList.remove('up'); void E.bpm.offsetWidth; E.bpm.classList.add('up'); }
    const w = (Z.res / Z.C.soul * 100).toFixed(1) + '%'; if (Z.hc.sb !== w) { Z.hc.sb = w; E.sbar.style.width = w; }
    if (set('cb', E.cbN, String(Z.combo)) && Z.combo > 0 && Z.combo % 10 === 0) { E.cb.classList.remove('pop'); void E.cb.offsetWidth; E.cb.classList.add('pop'); }
    set('mu', E.mu, `×${((1 + Math.min(1, Z.combo / 50)) * (Z.fever > 0 ? 1.6 : 1)).toFixed(2)}`); set('mus', E.mus, Z.fever > 0 ? '🔥 魂潮' : Z.combo >= 50 ? '倍率封顶' : '');
    const bp = Z.bt >= 0 && Z.phase === 'play' ? Math.pow(1 - (Z.bt - Math.floor(Z.bt)), 4) : 0, danger = Z.pres > 0.7;
    const vc = danger ? '#c00010' : Z.fever > 0 ? '#ffb020' : Z.col; if (Z.hc.vc !== vc) { Z.hc.vc = vc; E.vig.style.setProperty('--vc', vc); }
    E.vig.style.opacity = (0.3 + 0.2 * Z.I + bp * (0.1 + 0.22 * Z.I) + (danger ? 0.2 * (0.5 + 0.5 * Math.sin(Z.t * 14)) : 0)).toFixed(3);
  }
  function pop(t, c) { const e = Z.el.jg; e.textContent = t; e.style.color = c; e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); }
  function banner(t, s, c, dur) { const e = Z.el.bn; e.querySelector('b').textContent = t; e.querySelector('small').textContent = s || ''; e.style.setProperty('--bc', c || Z.col); e.style.setProperty('--bd', (dur || 1.4) + 's'); e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); }
  function gainF(n) { if (n < 0.5) return; const s = document.createElement('span'); s.textContent = '+' + (n < 10 ? n.toFixed(1) : Math.round(n)); Z.el.gf.appendChild(s); setTimeout(() => s.remove(), 900); }
  function flash(a, c) { const f = Z.el.fl; f.style.background = c || '#fff'; f.style.transition = 'none'; f.style.opacity = a; void f.offsetWidth; f.style.transition = 'opacity .45s'; f.style.opacity = 0; }
  function canvas3d() { return (window.G && G.renderer && G.renderer.domElement) || document.querySelector('#game canvas'); }
  function memFlash(i) {
    const M = Z.mems[i % Z.mems.length], m = Z.el.mm; m.querySelector('.w').textContent = M.w; m.querySelector('.k').textContent = M.k; m.classList.remove('on'); void m.offsetWidth; m.classList.add('on');
    clearTimeout(Z.memTm); Z.memTm = setTimeout(() => m.classList.remove('on'), 5600); Z.memT = Z.t;
    const cv = canvas3d(); if (cv) { cv.style.transition = 'none'; cv.style.filter = 'sepia(.6) saturate(.6) contrast(1.1) brightness(1.08)'; void cv.offsetWidth; cv.style.transition = 'filter 1.6s'; setTimeout(() => { if (cv) cv.style.filter = ''; }, 120); }
  }
  // 轨道：音符从两侧流向中心环；每拍一条刻度，4 拍一条粗线；中心环外圈＝魂压
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function gem(g, x, y, r, fill, line) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.8, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.8, y); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (line) { g.strokeStyle = line; g.lineWidth = 2; g.stroke(); } }
  function drawLane() {
    const cv = Z.cv; if (!cv) return; const g = Z.g2, W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1); if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, ppb = cl(W * 0.13, 64, 118), bt = Z.bt, span = cx / ppb, rgb = Z.rgb, fev = Z.fever > 0, bp = bt >= 0 ? Math.pow(1 - (bt - Math.floor(bt)), 5) : 0;
    const tr = g.createLinearGradient(0, 0, W, 0); tr.addColorStop(0, 'rgba(10,6,8,0)'); tr.addColorStop(0.1, 'rgba(10,6,8,.82)'); tr.addColorStop(0.9, 'rgba(10,6,8,.82)'); tr.addColorStop(1, 'rgba(10,6,8,0)');
    g.fillStyle = tr; rr(g, 0, cy - 21, W, 42, 21); g.fill();
    g.strokeStyle = fev ? `rgba(255,214,120,${0.35 + 0.45 * bp})` : `rgba(${rgb},${0.16 + 0.32 * bp})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(W * 0.06, cy - 21); g.lineTo(W * 0.94, cy - 21); g.moveTo(W * 0.06, cy + 21); g.lineTo(W * 0.94, cy + 21); g.stroke();
    for (let b = Math.max(0, Math.ceil(bt)); b < bt + span; b++) { const o = (b - bt) * ppb, bar = (b - Z.b0) % 4 === 0, a = (1 - o / cx) * (bar ? 0.55 : 0.22), hh = bar ? 15 : 9; g.strokeStyle = `rgba(255,236,210,${a})`; g.lineWidth = bar ? 2 : 1; g.beginPath(); g.moveTo(cx - o, cy - hh); g.lineTo(cx - o, cy + hh); g.moveTo(cx + o, cy - hh); g.lineTo(cx + o, cy + hh); g.stroke(); }
    let prev = null;
    for (const n of Z.notes) {
      if (n.b - bt > span + 0.3) break; if (n.done) { prev = null; continue; }
      const o = (n.b - bt) * ppb, fa = cl(1.3 - o / cx, 0, 1);
      if (n.k === 'hold') {
        const o1 = n.hs ? 0 : Math.max(0, o), o2 = Math.min(cx, Math.max(0, (n.e - bt) * ppb));
        for (const s of [-1, 1]) { const xa = cx + s * o1, xb = cx + s * o2; g.fillStyle = n.hs ? `rgba(${rgb},.9)` : `rgba(${rgb},.42)`; rr(g, Math.min(xa, xb) - 6, cy - 7, Math.abs(xb - xa) + 12, 14, 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.stroke(); if (!n.hs) gem(g, cx + s * Math.max(0, o), cy, 11, `rgb(${rgb})`, '#fff'); gem(g, xb, cy, 7, 'rgba(255,255,255,.9)'); }
        if (!n.hs && o < ppb * 2.5) { g.fillStyle = 'rgba(255,240,220,.8)'; g.font = '700 11px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('按住', cx + o, cy - 16); g.fillText('按住', cx - o, cy - 16); }
        prev = null; continue;
      }
      if (n.k === 'mash') {
        const o1 = Math.max(0, o), o2 = Math.min(cx, Math.max(0, (n.e - bt) * ppb));
        for (const s of [-1, 1]) { const xa = Math.min(cx + s * o1, cx + s * o2), wd = Math.abs(o2 - o1); if (wd < 1) continue; g.save(); g.fillStyle = 'rgba(255,140,40,.3)'; rr(g, xa, cy - 15, wd, 30, 6); g.fill(); g.clip(); g.strokeStyle = 'rgba(255,190,90,.55)'; g.lineWidth = 3; const sh = (Z.t * 80) % 14; for (let x = xa - 30; x < xa + wd + 30; x += 14) { g.beginPath(); g.moveTo(x + sh, cy + 15); g.lineTo(x + 16 + sh, cy - 15); g.stroke(); } g.restore(); }
        if (o > 0 && o < cx) { g.fillStyle = '#ffc070'; g.font = '800 12px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText(`连按 ×${n.need}`, cx + o + Math.min(60, (o2 - o) / 2), cy - 19); }
        prev = null; continue;
      }
      if (n.hid && n.b - bt < 2.2) { prev = null; continue; }
      if (prev && n.b - prev.b <= 0.55 && !prev.hid && !n.hid) { const po = (prev.b - bt) * ppb; g.strokeStyle = `rgba(255,255,255,${0.32 * fa})`; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - po, cy); g.lineTo(cx - o, cy); g.moveTo(cx + po, cy); g.lineTo(cx + o, cy); g.stroke(); }
      for (const s of [-1, 1]) {
        const x = cx + s * o; g.globalAlpha = n.hid ? 0.3 * fa : fa;
        if (n.hid) gem(g, x, cy, 10, null, 'rgba(255,255,255,.85)');
        else if (n.k === 'ghost') { g.strokeStyle = '#ff4a4a'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(x - 7, cy - 7); g.lineTo(x + 7, cy + 7); g.moveTo(x + 7, cy - 7); g.lineTo(x - 7, cy + 7); g.stroke(); if (o < ppb * 2) { g.fillStyle = '#ff8a8a'; g.font = '700 11px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('别按', x, cy - 15); } }
        else if (n.k === 'heavy') { g.shadowColor = '#ffd27a'; g.shadowBlur = 14; gem(g, x, cy, 15, '#ffcf5a', '#fff'); g.shadowBlur = 0; g.strokeStyle = 'rgba(255,220,140,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(x, cy, 19, 0, PI * 2); g.stroke(); }
        else if (n.k === 'off') gem(g, x, cy, 10, 'rgba(10,20,30,.6)', '#7fe0ff');
        else { g.shadowColor = `rgb(${rgb})`; g.shadowBlur = 10; gem(g, x, cy, 11, `rgb(${rgb})`, '#fff'); g.shadowBlur = 0; }
        g.globalAlpha = 1;
      }
      prev = n;
    }
    const R0 = 19 + 4 * bp, pr = cl(Z.pres, 0, 1);
    g.fillStyle = 'rgba(8,4,6,.88)'; g.beginPath(); g.arc(cx, cy, R0, 0, PI * 2); g.fill();
    g.lineWidth = 3; g.strokeStyle = fev ? '#ffd27a' : `rgb(${rgb})`; g.shadowColor = g.strokeStyle; g.shadowBlur = 10 + 12 * bp + (Z.held ? 10 : 0); g.stroke(); g.shadowBlur = 0;
    g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(cx, cy, R0 + 7, 0, PI * 2); g.stroke();
    if (pr > 0.005) { g.strokeStyle = pr > 0.7 ? `rgba(255,60,50,${0.75 + 0.25 * Math.sin(Z.t * 18)})` : pr > 0.45 ? '#ff9a4a' : '#ffd27a'; g.beginPath(); g.arc(cx, cy, R0 + 7, -PI / 2, -PI / 2 + pr * PI * 2); g.stroke(); }
    g.fillStyle = '#efe4d4'; g.font = '700 10px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Z.held ? '●' : '空格', cx, cy + 0.5); g.textBaseline = 'alphabetic';
    const mn = Z.mashN; if (mn) { g.fillStyle = mn.cnt >= mn.need ? '#9fe8a0' : '#ffd27a'; g.font = '900 16px Consolas,monospace'; g.fillText(`${mn.cnt} / ${mn.need}`, cx, cy - 26); }
    for (let i = Z.lfx.length - 1; i >= 0; i--) {
      const f = Z.lfx[i], u = (Z.t - f.t) / 0.42; if (u >= 1) { Z.lfx.splice(i, 1); continue; }
      g.strokeStyle = f.c; g.globalAlpha = 1 - u; g.lineWidth = 3 * (1 - u) + 1; g.beginPath(); g.arc(cx, cy, R0 + 6 + u * 46 * f.s, 0, PI * 2); g.stroke();
      if (f.s > 0.6) for (let j = 0; j < 8; j++) { const a = j / 8 * PI * 2 + f.t * 7, r1 = R0 + 8 + u * 54 * f.s, r2 = r1 + 12 * (1 - u); g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.7); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2 * 0.7); g.stroke(); }
      g.globalAlpha = 1;
    }
  }
  function results() {
    const k = Z.kind, gr = Z.gr, c = Z.cnt, R = Z.el.rs, beats = Math.max(0, Math.floor(Z.bt - Z.b0));
    R.innerHTML = `<div class="gd">${gr.g}</div><h2>${k === 'burst' ? '残魂炸开' : '收手'}</h2><div class="n">+${Z.pay} 🔮${k === 'burst' ? `<small>迸散 ${Math.max(0, Math.round(Z.pool) - Z.pay)}</small>` : ''}</div>
<div class="st"><div><b>${beats}</b>撑过的拍</div><div><b>${Z.best}</b>最高连击</div><div><b>♩${Math.round(Z.maxBpm)}</b>最快</div><div><b>${Math.round(gr.acc * 100)}%</b>准度</div></div>
<p>完美 ${c.perfect} · 好 ${c.great} · 偏 ${c.ok} · 忍住 ${c.dodge} · 失 ${c.miss}　残魂还剩 ${Math.round(Z.res / Z.C.soul * 100)}%</p>${Z.extra.length ? `<p style="color:#9fe08a">${Z.extra.join('　')}</p>` : ''}<div class="x2">空格 / 点击 关闭</div>`;
    R.classList.add('on'); R.onclick = () => { if (Z && Z.endT > 0.8) close(); };
  }

  // ---------------- 声音：节拍鼓（提前排程）+ 低频嗡鸣 + 每一下的木头 / 湿响 ----------------
  const ac = () => (window.SFX && SFX.on && SFX.ctx) ? SFX.ctx : null;
  const play = (n, v, r) => { try { SFX.play && SFX.play(n, v, r); } catch (e) { } };
  let NB = null;
  function nbuf(X) { if (!NB || NB.sampleRate !== X.sampleRate) { const n = X.sampleRate; NB = X.createBuffer(1, n, X.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } return NB; }
  function tone(t, f0, f1, dur, vol, type) { const X = ac(); if (!X || !(vol > 0)) return; const o = X.createOscillator(), g = X.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(SFX.out); o.start(t); o.stop(t + dur + 0.03); }
  function nz(t, dur, vol, type, f0, f1, q) { const X = ac(); if (!X || !(vol > 0)) return; const s = X.createBufferSource(); s.buffer = nbuf(X); const f = X.createBiquadFilter(); f.type = type; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); const g = X.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(SFX.out); s.start(t, Math.random() * 0.4, dur + 0.05); }
  function drum(b, t) {
    const I = Z.I, lv = Z.k || 0, spb = 60 / Z.bpm;
    if (b < Z.b0) { const last = b === Z.b0 - 1; tone(t, last ? 1760 : 1320, last ? 1700 : 1280, 0.07, 0.07, 'square'); return; }
    tone(t, 150, 42, 0.24, 0.32 + 0.22 * I, 'sine'); nz(t, 0.05, 0.06 + 0.05 * I, 'lowpass', 1200, 300, 0.7);
    if (lv >= 2 || Z.fever > 0) nz(t + spb / 2, 0.035, 0.03 + 0.03 * I, 'highpass', 7000, 9000, 0.8);
    if (lv >= 4 && (b - Z.b0) % 2 === 1) { nz(t, 0.13, 0.07 + 0.05 * I, 'bandpass', 1800, 900, 0.9); tone(t, 220, 140, 0.08, 0.04 * (1 + I), 'triangle'); }
    if (Z.fever > 0) { nz(t + spb / 4, 0.03, 0.04, 'highpass', 8000, 9500, 0.8); nz(t + spb * 3 / 4, 0.03, 0.04, 'highpass', 8000, 9500, 0.8); }
  }
  function audio(bt) {
    const X = ac(); if (!X) return; const now = X.currentTime, spb = 60 / Z.bpm;
    if (Z.sb == null) Z.sb = Math.max(0, Math.ceil(bt));
    while (Z.sb <= bt + 0.12 / spb) { const b = Z.sb; if (b >= 0) drum(b, now + Math.max(0, (b - bt) * spb)); Z.sb++; }
    const d = Z.drone; if (d) { const f = 41.2 * Math.pow(Z.bpm / Z.C.bpm0, 0.6); d.o1.frequency.setTargetAtTime(f, now, 0.3); d.o2.frequency.setTargetAtTime(f * 1.006, now, 0.3); d.f.frequency.setTargetAtTime(240 + 900 * Z.I + (Z.fever > 0 ? 600 : 0), now, 0.2); d.g.gain.setTargetAtTime(0.03 + 0.045 * Z.I, now, 0.3); }
  }
  function droneOn() { const X = ac(); if (!X) return; try { const o1 = X.createOscillator(), o2 = X.createOscillator(), f = X.createBiquadFilter(), g = X.createGain(); o1.type = o2.type = 'sawtooth'; o1.frequency.value = 41.2; o2.frequency.value = 41.45; f.type = 'lowpass'; f.frequency.value = 300; f.Q.value = 2; g.gain.value = 0.0001; o1.connect(f); o2.connect(f); f.connect(g); g.connect(SFX.out); o1.start(); o2.start(); g.gain.setTargetAtTime(0.035, X.currentTime, 0.6); Z.drone = { o1, o2, f, g }; } catch (e) { } }
  function droneOff() { const d = Z && Z.drone, X = ac(); if (!d) return; Z.drone = null; try { const t = X ? X.currentTime : 0; d.g.gain.setTargetAtTime(0.0001, t, 0.25); d.o1.stop(t + 1.2); d.o2.stop(t + 1.2); } catch (e) { } }
  function hitSnd(q, a, kind) {
    const X = ac(); if (!X) return; const t = X.currentTime;
    if (q === 'miss') { tone(t, 92, 40, 0.3, 0.16, 'sawtooth'); nz(t, 0.28, 0.1, 'bandpass', 380, 120, 2.2); play('wood', 0.45, 0.55); return; }
    play('wood', 0.2 + 0.3 * a, 0.72 + 0.22 * Math.random()); tone(t, 120 + 50 * a, 45, 0.18, 0.12 * a + 0.04, 'sine'); nz(t, 0.11, 0.05 * a + 0.025, 'bandpass', 820, 260, 1.4);
    if (kind !== 'stray' && Math.random() < 0.55) try { SFX.squish && SFX.squish(0.22 * a); } catch (e) { }
    if (q === 'perfect') tone(t + 0.01, 1320 * Math.pow(2, (Z.combo % 8) * 2 / 12), 1980, 0.2, 0.03, 'triangle');
    if (kind === 'heavy') play('heavy', 0.42, 0.85);
  }

  // ---------------- 节拍 / 判定 ----------------
  const QM = { perfect: 1.3, great: 1, ok: 0.45, miss: 0, dodge: 0.3 }, QN = { perfect: '完美', great: '好', ok: '偏', miss: '失', dodge: '忍住' }, QC = { perfect: '#ffe28a', great: '#9fe8a0', ok: '#ffb070', miss: '#ff5a5a', dodge: '#8fd8ff' };
  const MEMK = [2, 4, 7, 11, 16, 22, 29, 37, 46];
  const nowBeat = () => Z.bt + cl((performance.now() - Z.wall) / 1000, 0, 0.05) * Z.bpm / 60;
  function qual(adt, tail) { const w = Z.C.win, m = tail ? 1.3 : 1; return adt <= w.p * m ? 'perfect' : adt <= w.g * m ? 'great' : adt <= w.o * m ? 'ok' : 'miss'; }
  function extract(m) { const e = Z.res * Z.C.p * m; Z.res -= e; const g = e * (1 + Math.min(1, Z.combo / 50)) * (Z.fever > 0 ? 1.6 : 1); Z.pool += g; return g; }
  function judge(n, q, sub) {
    const C = Z.C; let mult = QM[q] || 0, pr;
    if (sub !== 'head') n.done = true;
    if (q === 'miss') { Z.combo = 0; Z.cnt.miss++; pr = sub === 'ghost' ? 0.15 : sub === 'break' ? 0.12 : C.missP; }
    else { Z.combo++; Z.cnt[q]++; pr = q === 'perfect' ? -0.035 : q === 'great' ? -0.02 : q === 'dodge' ? -0.01 : 0.03; }
    if (n.k === 'heavy') mult *= 2; if (n.hid) mult *= 1.5; if (sub === 'tail') mult *= 1.4;
    Z.best = Math.max(Z.best, Z.combo); Z.pres = cl(Z.pres + pr, 0, 1.2);
    const gain = mult > 0 ? extract(mult) : 0, big = n.k === 'heavy' || sub === 'tail';
    if (q !== 'dodge') stroke(q === 'miss' ? 0.4 : (q === 'perfect' ? 1 : q === 'great' ? 0.8 : 0.5) * (big ? 1.2 : 1), q, n.k === 'heavy' ? 'heavy' : sub);
    pop(QN[q] + (big && q !== 'miss' ? '！' : ''), QC[q]); gainF(gain); Z.lfx.push({ t: Z.t, c: QC[q], s: q === 'perfect' ? 1 : q === 'miss' ? 0.5 : 0.75 });
    if (q === 'miss') { flash(0.16, '#600'); Z.jam = 0.18; if (!Z.said.miss || Z.t - Z.said.miss > 6) { Z.said.miss = Z.t; Z.o.api.sub(`<span class="d">${esc(pk(SENS.miss))}</span>`); } }
    if (Z.combo > 0 && Z.combo % 40 === 0) fever();
    if (Z.pres >= 1 && Z.phase === 'play') burst();
    else if (Z.pres > 0.75 && !Z.said.danger) { Z.said.danger = 1; Z.o.api.sub(`<b style="color:#ff8a7a">${esc(pk(SENS.danger))}</b>`); } else if (Z.pres < 0.5) Z.said.danger = 0;
  }
  const _ji = new V3();
  function stroke(a, q, kind) {
    const real = kind !== 'stray';
    Z.thrT = 0.075; Z.thrA = q === 'miss' ? 0.35 : kind === 'stray' ? 0.3 : kind === 'mash' ? 0.55 : q === 'perfect' || kind === 'heavy' || kind === 'tail' ? 1 : q === 'great' ? 0.85 : 0.6; Z.lastB = nowBeat();
    Z.kick = Math.max(Z.kick, Math.min(1, a)); Z.spasm = Math.min(1, Z.spasm + 0.5 * a); if (real) Z.glow = Math.min(1, Z.glow + 0.6 * a);
    const j = Z.jit; j.v.addScaledVector(_ji.copy(Z.T.out).negate(), 0.16 * a); j.w.x += (Math.random() - 0.5) * 2.4 * a; j.w.y += (Math.random() - 0.5) * 2.4 * a; j.w.z += (Math.random() - 0.5) * 2.4 * a;
    Z.ck = Math.min(1.4, Z.ck + 0.7 * a); Z.croll += (Math.random() - 0.5) * 0.05 * a; Z.shk = Math.max(Z.shk, q === 'miss' ? 0.01 : 0.003 * a);
    hitSnd(q, a, kind);
    if (real && q !== 'miss') { spawnW(Math.round(3 + 4 * a + Z.C.r)); if (q === 'perfect') burstCry(1 + (Math.random() < 0.4 ? 1 : 0), false, true); if (kind === 'heavy' || (a > 0.9 && Z.I > 0.5 && Math.random() < 0.5)) drops(3 + Math.floor(Math.random() * 4)); }
    if (Z.pat === 'alt') Z.altS *= -1;
  }
  function autoJudge(bt) {
    const W = Z.C.win.o; Z.nextB = null; Z.mashN = null;
    for (const n of Z.notes) {
      if (n.done) continue;
      if (n.b > bt + 2) { if (Z.nextB == null && n.k !== 'ghost' && n.k !== 'mash') Z.nextB = n.b; break; }
      const late = (bt - n.b) * n.spb;
      if (n.k === 'mash') { if (bt >= n.b && bt < n.e) Z.mashN = n; if (bt >= n.e) { const r = n.cnt / n.need; judge(n, r >= 1 ? 'perfect' : r >= 0.75 ? 'great' : r >= 0.5 ? 'ok' : 'miss', 'mash'); } continue; }
      if (n.k === 'hold') {
        if (!n.hs) { if (late > W) { judge(n, 'miss', 'head-miss'); continue; } }
        else { if ((bt - n.e) * n.spb > W * 1.3) { Z.holdN = null; judge(n, Z.held ? 'great' : 'miss', 'tail'); } continue; }
      } else if (late > W) { judge(n, n.k === 'ghost' ? 'dodge' : 'miss', n.k === 'ghost' ? 'dodge' : ''); continue; }
      if (Z.nextB == null && n.k !== 'ghost' && n.b >= bt - 0.05) Z.nextB = n.b;
    }
  }
  function press() {
    if (!Z) return; if (Z.phase === 'end') { if (Z.endT > 0.8) close(); return; } if (Z.phase !== 'play') return;
    Z.held = true; const bt = nowBeat(); if (bt < Z.b0 - 0.5) return;
    const m = Z.mashN; if (m && !m.done) { m.cnt++; extract(0.25); stroke(0.55, 'great', 'mash'); Z.lfx.push({ t: Z.t, c: '#ffb070', s: 0.45 }); if (m.cnt === m.need) pop('够了！', '#9fe8a0'); return; }
    let best = null, bd = 1e9; const W = Z.C.win.o;
    for (const n of Z.notes) { if (n.done || !PRESS[n.k] || (n.k === 'hold' && n.hs)) continue; const dt = (bt - n.b) * n.spb; if (dt < -W) break; const a = Math.abs(dt); if (a <= W && a < bd) { best = n; bd = a; } }
    if (!best) { Z.pres = Math.min(1.2, Z.pres + 0.015); stroke(0.3, 'ok', 'stray'); pop('空', '#a89886'); return; }
    if (best.k === 'ghost') { judge(best, 'miss', 'ghost'); pop('咬住了', '#ff5a5a'); return; }
    const q = qual(bd); if (best.k === 'hold') { best.hs = q; Z.holdN = best; judge(best, q, 'head'); return; }
    judge(best, q);
  }
  function release() {
    if (!Z) return; Z.held = false; const n = Z.holdN; if (!n || n.done || Z.phase !== 'play') return; Z.holdN = null;
    const dt = (nowBeat() - n.e) * n.spb; if (dt < -Z.C.win.o * 1.3) { judge(n, 'miss', 'break'); pop('断了', '#ff5a5a'); return; }
    judge(n, qual(Math.abs(dt), true), 'tail');
  }
  function onBeat(b) {
    Z.beatT = Z.t;
    if (b >= 0 && b < Z.b0) { banner(b === Z.b0 - 1 ? '汲！' : String(Z.b0 - 1 - b), b === 0 ? '跟着鼓点：音符碰到中心环时按空格' : '', Z.col, 0.75); Z.thrT = 0.06; Z.thrA = 0.3; Z.lastB = b; return; }
    if (b >= Z.b0 && !Z.holdN && !Z.mashN && !Z.notes.some(n => !n.done && PRESS[n.k] && n.k !== 'ghost' && Math.abs(n.b - b) < 0.3)) { Z.thrT = 0.06; Z.thrA = 0.45; Z.lastB = b; Z.kick = Math.max(Z.kick, 0.25); }
  }
  function onPhrase(p, up) {
    const api = Z.o.api, sp = { drag: 'drag', mash: 'mash', bait: 'bait', echo: 'echo', breath: 'breath' }[p.id];
    if (p.tip && (p.first || p.breath)) banner(p.n, p.tip, p.id === 'bait' ? '#ff5a5a' : Z.col, 2.0);
    else if (up && p.k % 3 === 0) banner(`♩ ${Math.round(p.bpm)}`, '加速', '#ffd27a', 1.0);
    else if (p.k > 0 && !['march', 'pair', 'pulse'].includes(p.id)) banner(p.n, '', Z.col, 0.9);
    if (MEMK.includes(p.k)) memFlash(Z.memI++);
    else if (sp) api.sub(`<span class="d">${esc(pk(SENS[sp]))}</span>`);
    else if (p.k % 2 === 1) api.sub(`<span class="d">${esc(pk(Z.I > 0.45 && Math.random() < 0.5 ? SENS.spasm : Math.random() < 0.5 ? SENS.soul : SENS.hit[Z.mode]))}</span>`);
    else if (up && p.k % 4 === 0) api.sub(`<span class="d">${esc(pk(SENS.faster))}</span>`);
    Z.cutB = -99;
  }
  function fever() {
    Z.fever = 8; banner('魂 潮', `${Z.combo} 连击 · 魂晶 ×1.6`, '#ffd27a', 1.6); flash(0.32, '#ffd27a'); Z.o.api.sub(`<b style="color:#ffd27a">${esc(pk(SENS.fever))}</b>`); burstCry(6, false, true);
    const X = ac(); if (X) { const t = X.currentTime; [0, 4, 7, 12].forEach((s, i) => tone(t + i * 0.06, 440 * Math.pow(2, s / 12), 440 * Math.pow(2, s / 12), 0.5, 0.04, 'triangle')); }
    cutTo('eyes', 2 * 60 / Z.bpm); Z.cutB = Math.floor(Z.bt);
  }
  function burst() { Z.phase = 'burst'; Z.burstT = 0; Z.holdN = null; Z.mashN = null; flash(0.6, '#ff2020'); Z.shk = 0.03; Z.o.api.sub(`<b style="color:#ff8a7a">${esc(SENS.burst[0])}</b>`); play('heavy', 0.8, 0.6); cutTo('face', 3); droneOff(); }
  function tick(dt) {
    const prev = Z.bt; Z.bt += dt * Z.bpm / 60; const bt = Z.bt;
    while (!Z.phr.length || Z.phr[Z.phr.length - 1].b < bt + 16) phrase(Z.phr.length);
    let cur = null; for (let i = Z.phr.length - 1; i >= 0; i--) if (Z.phr[i].b <= bt) { cur = Z.phr[i]; break; }
    if (cur && cur !== Z.cur) { const up = !!Z.cur && cur.bpm > Z.cur.bpm + 0.01; Z.cur = cur; Z.k = cur.k; Z.bpm = cur.bpm; Z.maxBpm = Math.max(Z.maxBpm, Z.bpm); onPhrase(cur, up); }
    if (Math.floor(bt) > Math.floor(prev)) onBeat(Math.floor(bt));
    autoJudge(bt); if (Z.phase !== 'play') return;
    const db = bt - prev; Z.pres = Math.max(0, Z.pres - 0.008 * db); if (Z.fever > 0) Z.fever = Math.max(0, Z.fever - db);
    if (Z.holdN && !Z.holdN.done) { extract(0.5 * db); if (Math.random() < dt * 40) spawnW(1); }
    Z.I = cl(0.12 + 0.05 * Z.k + 0.42 * Z.pres + (Z.fever > 0 ? 0.25 : 0), 0, 1);
    if (Z.notes.length > 90) Z.notes = Z.notes.filter(n => !n.done || bt - n.b < 1);
  }
  function grade() { const c = Z.cnt, n = c.perfect + c.great + c.ok + c.miss + c.dodge || 1, acc = (c.perfect + 0.8 * c.great + 0.4 * c.ok + 0.7 * c.dodge) / n, b = Math.max(0, Z.bt - Z.b0); return { acc, g: acc >= 0.93 && b >= 96 ? 'S' : acc >= 0.85 && b >= 48 ? 'A' : acc >= 0.72 && b >= 24 ? 'B' : acc >= 0.55 ? 'C' : 'D' }; }

  // ---------------- 开始 / 结束 ----------------
  function begin(o) { // { rec, h, mode:'m'|'n', k, api:{ sub, onEnd } }
    if (Z || !on()) return false; const rec = o.rec, c = rec && rec.c, ck = can(rec); if (!ck.ok) { o.api.sub(`<span class="d">${esc(ck.why)}。</span>`); return false; }
    const h = o.h, hb = h && h.hb; if (!hb || !hb.setExpression || !hb.meta || !window.G || !G.camera || !G.scene) return false; if (!ui()) return false;
    const C = cfg(c), L = rec.look || (rec.look = {}), col = COL[C.r], cam = G.camera, M = hb.meta, cc = new THREE.Color(col);
    const eyeY = M.eye && M.eye[1] != null ? M.eye[1] : -0.012, front = M.front != null ? M.front : 0.083, bottom = M.bottom != null ? M.bottom : -0.0965, top = M.skullTop != null ? M.skullTop : 0.0965, cut = M.cut || {}, mY = eyeY - 0.0655, ex = M.eye && M.eye[0] ? Math.abs(M.eye[0]) : 0.016;
    Z = { o, rec, h, hb, c, C, mode: o.mode === 'n' ? 'n' : 'm', col, rgb: `${Math.round(cc.r * 255)},${Math.round(cc.g * 255)},${Math.round(cc.b * 255)}`, kh: cl((o.k || 1.4) * 0.82, 0.9, 1.6), t: 0, wall: performance.now(), phase: 'play',
      bt: -1.6, b0: 4, bpm: C.bpm0, maxBpm: C.bpm0, k: 0, cur: null, phr: [], notes: [], seenPh: {}, lastPh: '', sb: null,
      res: C.soul, pool: 0, combo: 0, best: 0, cnt: { perfect: 0, great: 0, ok: 0, miss: 0, dodge: 0 }, pres: 0.08, fever: 0, I: 0.15, held: false, holdN: null, mashN: null, nextB: null, lastB: -1,
      dep: -0.03, thrT: 0, thrA: 0, jam: 0, jaw: 0, kick: 0, spasm: 0, glow: 0, lfx: [], extra: [], mems: memories(c), memI: 0, said: {},
      ch: Object.assign({}, L.ex || {}), roll: (L.rl || [0, 0]).slice(), tg: (L.tg || 0) * 0.04, tw: 0, base: { ex: Object.assign({}, L.ex || {}), rl: (L.rl || [0, 0]).slice(), tg: L.tg || 0 }, pat: pk(['both', 'split', 'alt']), altS: 1,
      jit: { p: new V3(), v: new V3(), r: new V3(), w: new V3() }, ck: 0, croll: 0, shk: 0, cutB: -99, cutChk: -99, cutN: 0, recent: [],
      E: { p: new V3(), q: new Q4() }, c0: { p: cam.position.clone(), q: cam.quaternion.clone(), fov: cam.fov }, h0: { p: h.g.position.clone(), q: h.g.quaternion.clone() } };
    Z.F = { eyes: new V3(0, eyeY, front - 0.012), eyeL: new V3(ex, eyeY, front - 0.008), eyeR: new V3(-ex, eyeY, front - 0.008), mouth: new V3(0, mY, front - 0.004), face: new V3(0, (eyeY + mY) / 2, front - 0.02), cut: new V3(cut.x || 0, bottom, cut.z != null ? cut.z : -0.006), center: new V3(0, (bottom + top) / 2, 0), crown: new V3(0, top, -0.01), back: new V3(0, top * 0.45, -front * 0.95), hcen: new V3(0, (bottom + top) / 2 + 0.012, -0.008) };
    Z.D = Z.mode === 'm' ? { shallow: 0.012, mid: 0.055, deep: 0.118 } : { shallow: 0.025, mid: 0.07, deep: 0.13 };
    Z.anchor = Z.mode === 'm' ? new V3(0, mY, front - 0.003) : new V3(cut.x || 0, bottom + 0.003, cut.z != null ? cut.z : -0.006);
    Z.T = tableau(Z.mode); hb.group.updateMatrix(); Z.refG = Z.F[Z.T.rk].clone().applyMatrix4(hb.group.matrix);
    try { Z.floorY = (G.player && G.player.pos ? G.player.pos.y : cam.position.y - 1.6) + 0.01; } catch (e) { Z.floorY = cam.position.y - 1.6; }
    build3d(); bindEl(); cutTo('est', 6);
    root.style.setProperty('--c', col); const host = document.getElementById('riw'); host.classList.add('sipon'); host.style.setProperty('--c', col);
    Z.el.md.textContent = MN[Z.mode]; Z.el.rn.textContent = `${RN[C.r]} · ${EFN[C.r]}`; Z.el.rs.classList.remove('on'); Z.el.mm.classList.remove('on'); requestAnimationFrame(() => root && root.classList.add('in'));
    try { SFX.duck && SFX.duck(true); } catch (e) { } droneOn(); play('sack', 0.25, 1.2);
    o.api.sub(`<span class="d">${esc(pk(SENS.start[Z.mode]))}</span>`);
    return true;
  }
  function end(kind) {
    if (!Z || Z.phase === 'end') return; const c = Z.c, C = Z.C; Z.phase = 'end'; Z.endT = 0; Z.kind = kind; Z.holdN = null; Z.mashN = null; Z.depE = Z.dep; droneOff();
    const raw = Math.round(Z.pool), pay = Math.max(0, kind === 'burst' ? Math.floor(raw * C.keep) : raw), beats = Math.max(0, Math.floor(Z.bt - Z.b0)); Z.pay = pay; Z.gr = grade();
    try { if (pay > 0 && window.G && G.addCoins) G.addCoins(pay); } catch (e) { }
    try {
      if (C.r >= 2 && beats >= 64 && window.Recall && Recall.known && !Recall.known(c, 'goal')) { Recall.reveal(Z.rec, 'goal', true); Z.extra.push('想起了她生前最想做的事'); }
      if (C.r >= 3 && beats >= 96 && window.Sack && Sack.stashAdd && Sack.mk) { Sack.stashAdd(Sack.mk('dust', C.r - 1)); Z.extra.push(`魂尘 ×${C.r - 1}`); }
    } catch (e) { }
    c.sip = { k: kind, n: pay, t: Date.now(), b: beats, cb: Z.best, g: Z.gr.g, bpm: Math.round(Z.maxBpm), m: Z.mode };
    const L = Z.rec.look || (Z.rec.look = {}); L.pale = Math.max(L.pale || 0, 0.42); try { if (Z.hb.U && Z.hb.U.pale) Z.hb.U.pale.value = L.pale; } catch (e) { }
    try { G.save && G.save(); } catch (e) { }
    results(); Z.o.api.sub(`<b>${esc(pk(SENS[kind === 'burst' ? 'end' : 'stop']))}</b>`); if (kind !== 'burst') burstCry(14 + C.r * 6, false, true); memFlash(Z.memI++);
    try { SFX.coins && SFX.coins(); } catch (e) { }
    try { window.dispatchEvent(new CustomEvent('siphon-end', { detail: { rec: Z.rec, pay, kind } })); } catch (e) { }
  }
  function close() {
    if (!Z) return; const L = Z.rec.look || {}, hb = Z.hb;
    try { hb.setExpression(L.ex || {}); hb.setRoll(...(L.rl || [0, 0])); hb.setTongue((L.tg || 0) * 0.04, 0, (L.tg || 0) * 0.3); if (hb.setSway) hb.setSway(new V3()); } catch (e) { }
    droneOff(); clearTimeout(Z.memTm);
    if (Z.wg) { if (Z.wg.parent) Z.wg.parent.remove(Z.wg); try { Z.wg.traverse(x => { if (x.geometry && !x.isSprite) x.geometry.dispose(); if (x.material && x.isSprite) x.material.dispose(); }); (Z.mats || []).forEach(m => m.dispose()); if (Z.club) Z.club.material.dispose(); } catch (e) { } }
    const cv = canvas3d(); if (cv) cv.style.filter = '';
    try { SFX.duck && SFX.duck(false); } catch (e) { }
    if (Z.rig) Z.rig.g.visible = true;
    const host = document.getElementById('riw'); if (host) host.classList.remove('sipon'); if (root) { root.classList.remove('in'); const R = root.querySelector('.rs'); if (R) R.classList.remove('on'); }
    const o = Z.o; Z = null; try { o.api.onEnd && o.api.onEnd(); } catch (e) { }
  }
  function abort() {
    if (!Z) return; if (Z.phase === 'end') { if (Z.endT > 0.3) close(); return; } if (Z.phase === 'burst') return;
    if (Z.bt < Z.b0 - 0.3 && Z.pool < 0.5) { close(); return; } // 还没开始：不消耗这颗头
    end('stop');
  }

  // ---------------- 舞台（相对玩家视点 E）：首级姿态 / 木棒方向 / 肩膀 ----------------
  function tableau(mode) {
    if (mode === 'm') return { q: new Q4().setFromEuler(new THREE.Euler(-0.1, 1.0, 0, 'YXZ')), ref: new V3(0.02, -0.03, -0.56), rk: 'face', out: new V3(0.8, -0.32, 0.52).normalize() };
    const q = new Q4().setFromAxisAngle(new V3(1, 0, 0), 0.62).multiply(new Q4().setFromAxisAngle(new V3(0, 0, 1), PI)).multiply(new Q4().setFromAxisAngle(new V3(0, 1, 0), 0.35));
    return { q, ref: new V3(0, -0.01, -0.56), rk: 'center', out: new V3(0.5, 0.72, 0.48).normalize() };
  }
  function build3d() {
    const kh = Z.kh, kq = kh / 1.4, ws = Math.abs(Z.hb.group.getWorldScale(new V3()).x) || 1.55; Z.ws = ws;
    const wg = new THREE.Group(); wg.name = '__SIPHON__'; G.scene.add(wg); Z.wg = wg;
    Z.club = buildClub(ws, Z.col); wg.add(Z.club);
    const skin = new THREE.MeshStandardMaterial({ color: '#5a7a3a', roughness: 0.72, side: THREE.DoubleSide }), dark = new THREE.MeshStandardMaterial({ color: '#2a1d18', roughness: 0.9, side: THREE.DoubleSide }), cuff = new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.85 });
    Z.mats = [skin, dark, cuff];
    const sf = handGeos(true, kh); if (sf) { const R = radAt(CL.G) * ws + sf.ft * 0.9, yc = sf.yf - R; bend(sf, { R, z0: sf.z0, yc, thumb: true, maxA: 4.6 }); Z.fist = mkHand(sf, skin, dark); Z.fistP = { xc: sf.xc, yc, z0: sf.z0 }; wg.add(Z.fist); }
    const sc = handGeos(false, kh); if (sc) { const hr = Math.max(Z.F.crown.y - Z.F.hcen.y, -Z.F.back.z + 0.01) * ws, R = hr + 0.03 + sc.ft, z0 = sc.zMin * 0.06, yc = sc.yf - R; bend(sc, { R, z0, yc, maxA: 2.4 }); Z.claw = mkHand(sc, skin, dark); Z.clawP = { xc: sc.xc, yc, z0 }; Z.clawPhi = cl(0.5 * (-sc.zMin) / R, 0.2, 0.9); wg.add(Z.claw); }
    const arm = () => ({ fa: seg(0.042 * kq, 0.058 * kq, skin), ua: seg(0.064 * kq, 0.074 * kq, skin), el: ball(0.06 * kq, skin), sh: ball(0.078 * kq, skin), cf: seg(0.052 * kq, 0.054 * kq, cuff) });
    Z.armR = arm(); Z.armL = arm(); for (const a of [Z.armR, Z.armL]) for (const k in a) wg.add(a[k]);
    Z.sh = { R: new V3(0.27, -0.42, 0.04).multiplyScalar(kq), L: new V3(-0.27, -0.42, 0.04).multiplyScalar(kq), pR: new V3(0.75, -0.6, 0.25).normalize(), pL: new V3(-0.75, -0.6, 0.25).normalize(), L1: 0.46 * kq, L2: 0.44 * kq };
    fxBuild(wg);
  }
  const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3(), _e1 = new V3(), _f = new V3(), _X = new V3(), _Yv = new V3(), _Zv = new V3(), _t1 = new V3(), _t2 = new V3(), _t3 = new V3(), _t4 = new V3(), _t5 = new V3(), _t6 = new V3(), _t7 = new V3();
  const _q1 = new Q4(), _q2 = new Q4(), _m = new THREE.Matrix4(), _UP = new V3(0, 1, 0), _ZAX = new V3(0, 0, 1), _XAX = new V3(1, 0, 0), _eu = new THREE.Euler();
  const w2 = (p, out) => out.copy(p).applyMatrix4(Z.hb.group.matrixWorld);
  const eP = (p, out) => out.copy(p).applyQuaternion(Z.E.q).add(Z.E.p);
  const eD = (d, out) => out.copy(d).applyQuaternion(Z.E.q);
  function jitStep(dt) { const j = Z.jit, k = 220, c = Math.exp(-15 * dt); j.v.addScaledVector(j.p, -k * dt).multiplyScalar(c); j.p.addScaledVector(j.v, dt); j.w.addScaledVector(j.r, -k * dt).multiplyScalar(c); j.r.addScaledVector(j.w, dt); }
  function clubStep(dt) {
    const D = Z.D, bt = Z.bt; let tg; Z.thrT -= dt;
    if (Z.phase === 'end') tg = lerp(Z.depE, -0.09, sm(cl(Z.endT / 0.7, 0, 1)));
    else if (Z.phase === 'burst') tg = D.mid + Math.sin(Z.t * 60) * 0.012;
    else if (Z.thrT > 0) tg = lerp(D.mid, D.deep, Z.thrA);
    else if (Z.holdN && !Z.holdN.done) { const n = Z.holdN; tg = lerp(D.deep * 0.9, D.shallow, sm(cl((bt - n.b) / Math.max(0.2, n.e - n.b), 0, 1))); }
    else if (bt < -0.5) tg = lerp(-0.03, D.shallow, cl(Z.t / 1.1, 0, 1));
    else { const nx = Z.nextB, tb = nx != null && nx - bt < 1.3 ? nx : Math.floor(bt) + 1, span = Math.max(0.12, tb - Z.lastB), u = cl((bt - Z.lastB) / span, 0, 1); tg = u < 0.28 ? lerp(D.deep * 0.85, D.mid, eo(u / 0.28)) : lerp(D.mid, D.shallow, sm((u - 0.28) / 0.72)); }
    Z.dep += (tg - Z.dep) * (1 - Math.exp(-dt * (Z.thrT > 0 ? 70 : Z.phase === 'end' ? 30 : 16)));
    if (Z.jam > 0) { Z.jam -= dt; Z.dep += Math.sin(Z.t * 90) * 0.0025; }
    const lip = radAt(Math.max(0, Z.dep)), open = Z.mode === 'm' && Z.dep > 0 ? cl((lip - 0.0045) / (0.0155 - 0.0045), 0, 1) : 0; Z.jaw += (open - Z.jaw) * (1 - Math.exp(-dt * 40));
  }
  function placeHead() {
    const h = Z.h, T = Z.T, j = Z.jit, b = sm(cl(Z.t / 0.9, 0, 1));
    _q1.setFromEuler(_eu.set(j.r.x, j.r.y, j.r.z)); _q2.copy(Z.E.q).multiply(_q1).multiply(T.q);
    eP(_a.copy(T.ref).add(j.p), _b); _b.sub(_c.copy(Z.refG).applyQuaternion(_q2));
    if (b < 1) { h.g.position.copy(Z.h0.p).lerp(_b, b); h.g.quaternion.copy(Z.h0.q).slerp(_q2, b); } else { h.g.position.copy(_b); h.g.quaternion.copy(_q2); }
    h.g.updateMatrixWorld(true); if (h.vel) h.vel.set(0, 0, 0); if (h.av) h.av.set(0, 0, 0); h.sleep = 0;
  }
  function placeClub() {
    const ws = Z.ws, A = w2(Z.anchor, Z.contW || (Z.contW = new V3())), inn = eD(Z.T.out, Z.inW || (Z.inW = new V3())).negate();
    const tip = _a.copy(A).addScaledVector(inn, Z.dep * ws);
    Z.club.position.copy(tip); Z.club.quaternion.setFromUnitVectors(_UP, _b.copy(inn).negate());
    (Z.gripW || (Z.gripW = new V3())).copy(tip).addScaledVector(inn, -CL.G * ws);
    Z.club.material.emissiveIntensity = 0.12 + 0.6 * Z.glow + (Z.fever > 0 ? 0.35 : 0) + 0.15 * Z.I;
  }
  function ik(S, W, L1, L2, pole, out) {
    const d = _t1.copy(W).sub(S), len = d.length() || 1e-4; d.divideScalar(len);
    const D = Math.min(len, (L1 + L2) * 0.999), a = (L1 * L1 - L2 * L2 + D * D) / (2 * D), hh = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const p = _t2.copy(pole).addScaledVector(d, -pole.dot(d)); if (p.lengthSq() < 1e-8) p.set(0, -1, 0); p.normalize();
    return out.copy(S).addScaledVector(d, a).addScaledVector(p, hh);
  }
  function segAt(m, A, B) { const d = _t6.copy(B).sub(A), L = d.length() || 1e-4; m.position.copy(A); m.quaternion.setFromUnitVectors(_UP, d.divideScalar(L)); m.scale.set(1, L, 1); }
  function armAt(A, sh, el, wr, zh) {
    const kq = Z.kh / 1.4; segAt(A.fa, _t3.copy(wr).addScaledVector(zh, -0.02 * kq), el); segAt(A.ua, el, sh); A.el.position.copy(el); A.sh.position.copy(sh);
    const fd = _t4.copy(el).sub(wr).normalize(); segAt(A.cf, _t5.copy(wr).addScaledVector(fd, 0.012 * kq), _t7.copy(wr).addScaledVector(fd, 0.085 * kq));
  }
  function placeFist() { // 右手（镜像＝解剖学右手）：棒轴沿手的 X 横穿掌心，拇指朝棒尖；前臂朝肩膀
    if (!Z.fist) return; const P = Z.fistP, sh = eP(Z.sh.R, _e1), a = Z.inW, g0 = Z.gripW, wr = Z.wrR || (Z.wrR = new V3()), el = Z.elR || (Z.elR = new V3()), pole = eD(Z.sh.pR, _c);
    const f = _f.copy(sh).sub(g0).normalize();
    for (let i = 0; i < 2; i++) {
      _Zv.copy(f).addScaledVector(a, -f.dot(a)); if (_Zv.lengthSq() < 1e-6) _Zv.set(0, -1, 0); _Zv.normalize();
      _X.copy(a).negate(); _Yv.crossVectors(_Zv, _X);
      wr.copy(g0).addScaledVector(_X, -P.xc).addScaledVector(_Yv, -P.yc).addScaledVector(_Zv, -P.z0);
      ik(sh, wr, Z.sh.L1, Z.sh.L2, pole, el); f.copy(el).sub(wr).normalize();
    }
    _m.makeBasis(_X, _Yv, _Zv).setPosition(wr); Z.fist.matrix.copy(_m); Z.fist.matrixWorldNeedsUpdate = true;
    armAt(Z.armR, sh, el, wr, _Zv);
  }
  function placeClaw() { // 左手：掌心扣在后脑偏上，弯曲中心＝颅心，手指翻过头顶；前臂从脑后往下接到肩膀，不挡脸
    if (!Z.claw) return; const P = Z.clawP, C = w2(Z.F.hcen, _a), u = _b.set(0, Math.sin(0.62), -Math.cos(0.62)).applyQuaternion(Z.h.g.quaternion), sh = eP(Z.sh.L, _e1), wr = Z.wrL || (Z.wrL = new V3()), el = Z.elL || (Z.elL = new V3());
    const v = _c.copy(sh).sub(C); v.addScaledVector(u, -v.dot(u)); if (v.lengthSq() < 1e-6) v.set(0, 0, 1); v.normalize();
    const cs = Math.cos(Z.clawPhi), sn = Math.sin(Z.clawPhi);
    _Yv.copy(u).multiplyScalar(cs).addScaledVector(v, sn); _Zv.copy(u).multiplyScalar(-sn).addScaledVector(v, cs); _X.crossVectors(_Yv, _Zv);
    wr.copy(C).addScaledVector(_X, -P.xc).addScaledVector(_Yv, -P.yc).addScaledVector(_Zv, -P.z0);
    _m.makeBasis(_X, _Yv, _Zv).setPosition(wr); Z.claw.matrix.copy(_m); Z.claw.matrixWorldNeedsUpdate = true;
    ik(sh, wr, Z.sh.L1, Z.sh.L2, eD(Z.sh.pL, _d), el); armAt(Z.armL, sh, el, wr, _Zv);
  }

  // ---------------- 镜头：蒙太奇（按拍硬切，越往后切得越勤）----------------
  const SHOTS = {
    m: [
      { id: 'est', f: 'fc', az: 0.42, el: 0.1, d: 0.5, fov: 44, roll: 0, dr: { az: 0.08, d: -0.05 }, w: 2 },
      { id: 'face', f: 'face', az: 0.6, el: 0.16, d: 0.3, fov: 34, roll: 0.04, dr: { az: 0.1, d: -0.03 }, w: 3 },
      { id: 'eyes', f: 'eyes', az: 0.72, el: 0.18, d: 0.19, fov: 24, roll: 0.15, dr: { d: -0.025, roll: -0.06 }, w: 2 },
      { id: 'mouth', f: 'mouth', az: 1.45, el: 0.06, d: 0.23, fov: 30, roll: -0.05, dr: { az: -0.12 }, w: 2 },
      { id: 'low', f: 'face', az: 0.45, el: -0.42, d: 0.34, fov: 38, roll: -0.1, dr: { el: 0.1 }, w: 2 },
      { id: 'grip', f: 'club', az: 0.8, el: 0.3, d: 0.42, fov: 40, roll: 0.03, dr: { az: -0.14 }, w: 1 },
      { id: 'skull', f: 'center', az: -0.55, el: 0.5, d: 0.52, fov: 38, roll: -0.04, dr: { az: 0.12 }, w: 1 },
      { id: 'pov', f: 'mouth', along: 1, az: 0.15, el: 0.3, d: 0.4, fov: 34, roll: 0, dr: { d: -0.05 }, w: 1 }
    ],
    n: [
      { id: 'est', f: 'fc', az: 0.45, el: 0.32, d: 0.5, fov: 44, roll: 0, dr: { az: 0.08, d: -0.05 }, w: 2 },
      { id: 'cut', f: 'cut', az: -0.35, el: 0.82, d: 0.26, fov: 32, roll: 0.05, dr: { az: 0.12 }, w: 3 },
      { id: 'face', f: 'face', az: -0.35, el: -0.38, d: 0.3, fov: 34, roll: 0.04, dr: { az: 0.1 }, w: 3 },
      { id: 'eyes', f: 'eyes', az: -0.3, el: -0.44, d: 0.19, fov: 24, roll: 0.12, dr: { d: -0.02, roll: -0.05 }, w: 2 },
      { id: 'low', f: 'face', az: 0.25, el: -0.75, d: 0.36, fov: 38, roll: -0.08, dr: { az: -0.1 }, w: 2 },
      { id: 'side', f: 'center', az: 1.0, el: 0.18, d: 0.4, fov: 40, roll: 0.05, dr: { az: -0.12 }, w: 1 },
      { id: 'pov', f: 'cut', along: 1, az: 0.15, el: 0.25, d: 0.38, fov: 34, roll: 0, dr: { d: -0.05 }, w: 1 }
    ]
  };
  function cutTo(id, dur) {
    const L = SHOTS[Z.mode], s = L.find(x => x.id === id) || L[0], r = Math.random;
    Z.shot = { s, t0: Z.t, dur: Math.max(0.5, dur || 2), j: { az: (r() - 0.5) * 0.22, el: (r() - 0.5) * 0.12, d: (r() - 0.5) * 0.04, roll: (r() - 0.5) * 0.08, fov: (r() - 0.5) * 3 } };
    Z.camSnap = true; Z.recent.unshift(s.id); Z.recent.length = Math.min(Z.recent.length, 3); Z.cutN++;
  }
  function cutEvery() { const k = Z.k || 0; if (Z.cur && Z.cur.breath) return 8; if (Z.fever > 0) return 1; return k < 2 ? 8 : k < 4 ? 4 : k < 7 ? 2 : (Z.cutN % 3 === 2 ? 2 : 1); }
  function pickShot() {
    const L = SHOTS[Z.mode], pref = Z.fever > 0 ? ['eyes', 'mouth', 'low', 'face', 'cut', 'pov'] : Z.pres > 0.7 ? ['eyes', 'face', 'low'] : null;
    let c = L.filter(s => !Z.recent.includes(s.id)); if (pref) { const p = c.filter(s => pref.includes(s.id)); if (p.length) c = p; }
    let x = Math.random() * c.reduce((s, v) => s + (v.w || 1), 0); for (const s of c) { x -= s.w || 1; if (x <= 0) return s.id; } return c[0].id;
  }
  function director() {
    if (Z.phase === 'end') { if (Z.shot.s.id !== 'est') cutTo('est', 10); return; }
    if (Z.phase !== 'play') return; const b = Math.floor(Z.bt); if (b < 0 || b === Z.cutChk) return; Z.cutChk = b;
    const ev = cutEvery(); if (b - Z.cutB < ev) return; Z.cutB = b;
    cutTo(b < Z.b0 ? 'est' : pickShot(), ev * 60 / Z.bpm); if ((Z.k || 0) >= 3) flash(0.07, '#000');
  }
  function focusW(k, out) { if (k === 'club' || k === 'fc') { w2(Z.T.rk === 'face' ? Z.F.face : Z.F.center, out); return out.lerp(Z.gripW, k === 'club' ? 0.5 : 0.3); } return w2(Z.F[k] || Z.F.face, out); }
  function placeCam(cam, dt) {
    const sh = Z.shot, s = sh.s, j = sh.j, dr = s.dr || {}, u = cl((Z.t - sh.t0) / sh.dur, 0, 1), fw = focusW(s.f, _a);
    if (Z.camSnap || !Z.cf) { Z.cf = (Z.cf || new V3()).copy(fw); Z.camSnap = false; } else Z.cf.lerp(fw, 1 - Math.exp(-dt * 7));
    let az = s.az + j.az + (dr.az || 0) * u, el = s.el + j.el + (dr.el || 0) * u;
    if (s.along) { const o = Z.T.out; az += Math.atan2(o.x, o.z); el += Math.asin(cl(o.y, -1, 1)); }
    const d = (s.d + j.d + (dr.d || 0) * u) * (1 - 0.05 * Z.ck), dir = _b.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); if (dir.z < 0.15) { dir.z = 0.15; dir.normalize(); }
    eD(dir, _c); const hs = 0.0015 + 0.004 * Z.I + 0.006 * Z.ck, t = Z.t, pos = _d.copy(Z.cf).addScaledVector(_c, d);
    pos.x += Math.sin(t * 1.7) * hs + (Math.random() - 0.5) * Z.shk; pos.y += Math.sin(t * 2.3 + 1) * hs + (Math.random() - 0.5) * Z.shk; pos.z += Math.sin(t * 1.3 + 2) * hs;
    _m.lookAt(pos, Z.cf, eD(_UP, _e1)); _q1.setFromRotationMatrix(_m);
    const roll = s.roll + j.roll + (dr.roll || 0) * u + Z.croll; if (roll) _q1.multiply(_q2.setFromAxisAngle(_ZAX, roll));
    const fov = cl(s.fov + j.fov - 3.2 * Z.ck - (Z.fever > 0 ? 2 : 0), 16, 70), b = sm(cl(Z.t / 0.9, 0, 1));
    if (b < 1) { cam.position.copy(Z.c0.p).lerp(pos, b); cam.quaternion.copy(Z.c0.q).slerp(_q1, b); cam.fov = lerp(Z.c0.fov, fov, b); } else { cam.position.copy(pos); cam.quaternion.copy(_q1); cam.fov = fov; }
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  }

  // ---------------- 粒子：魂丝（沿木棒螺旋流进你手里）/ 魂晶 / 血滴 / 辉光 ----------------
  let DOT = null;
  function dotTex() { if (DOT) return DOT; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); DOT = new THREE.CanvasTexture(c); return DOT; }
  function fxBuild(wg) {
    const N = 320, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    Z.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.016, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); Z.pts.frustumCulled = false; Z.pts.renderOrder = 6; wg.add(Z.pts); Z.pN = N; Z.pl = [];
    Z.cry = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.009, 0), new THREE.MeshStandardMaterial({ color: '#ffe28a', emissive: '#ffb020', emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.2 }), 240); Z.cry.count = 0; Z.cry.frustumCulled = false; wg.add(Z.cry); Z.cl = [];
    Z.drp = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0032, 6, 4), new THREE.MeshStandardMaterial({ color: '#4a0608', roughness: 0.3 }), 60); Z.drp.count = 0; Z.drp.frustumCulled = false; wg.add(Z.drp); Z.dl = [];
    Z.mats.push(Z.pts.material, Z.cry.material, Z.drp.material);
    const sp = (s, o) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: Z.col, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending })); m.scale.setScalar(s); m.renderOrder = 7; wg.add(m); return m; };
    Z.glw = sp(0.06, 0.4); Z.eyeG = [sp(0.03, 0), sp(0.03, 0)];
  }
  function spawnW(n) {
    if (!Z.contW) return;
    for (let i = 0; i < n && Z.pl.length < Z.pN; i++) {
      const eye = Math.random() < 0.35, p = eye ? w2(Math.random() < 0.5 ? Z.F.eyeL : Z.F.eyeR, new V3()) : Z.contW.clone();
      p.x += (Math.random() - 0.5) * 0.012; p.y += (Math.random() - 0.5) * 0.012; p.z += (Math.random() - 0.5) * 0.012;
      Z.pl.push({ p, v: new V3((Math.random() - 0.5) * 0.25, 0.08 + Math.random() * 0.2, (Math.random() - 0.5) * 0.25), t: 0, st: 0, u: 0, a: Math.random() * 6.28, r: 0.006 + Math.random() * 0.012, sp: 1.4 + Math.random() * 1.2 });
    }
  }
  function burstCry(n, big, fly) { if (!Z.contW) return; for (let i = 0; i < n && Z.cl.length < 240; i++) Z.cl.push({ p: Z.contW.clone(), v: new V3((Math.random() - 0.5) * (big ? 1.8 : 0.6), 0.5 + Math.random() * (big ? 1.8 : 0.8), (Math.random() - 0.5) * (big ? 1.6 : 0.6)), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), w: new V3(Math.random() * 9, Math.random() * 9, 0), t: 0, life: big ? 3 + Math.random() : 1.6, s: 0.7 + Math.random() * 0.8, fly: fly ? 0.18 + Math.random() * 0.2 : 0 }); }
  function drops(n) { if (!Z.contW) return; for (let i = 0; i < n && Z.dl.length < 60; i++) Z.dl.push({ p: Z.contW.clone(), v: new V3((Math.random() - 0.5) * 0.7, 0.2 + Math.random() * 0.6, (Math.random() - 0.5) * 0.7), t: 0, life: 0.6 + Math.random() * 0.5 }); }
  const _cc = new THREE.Color(), _q3 = new Q4(), _s3 = new V3(), _m2 = new THREE.Matrix4(), _p1 = new V3(), _p2 = new V3(), _ax = new V3();
  function updFx(dt) {
    const pos = Z.pts.geometry.attributes.position, col = Z.pts.geometry.attributes.color, base = _cc.set(Z.fever > 0 ? '#ffe7a0' : Z.col), A = Z.contW, B = Z.gripW;
    const L = _ax.copy(B).sub(A).length() || 1e-3; _ax.divideScalar(L); _p1.copy(_ax).cross(Math.abs(_ax.y) < 0.9 ? _UP : _XAX).normalize(); _p2.copy(_ax).cross(_p1);
    for (let i = Z.pl.length - 1; i >= 0; i--) {
      const w = Z.pl[i]; w.t += dt;
      if (w.st === 0) { w.v.addScaledVector(_t7.copy(A).sub(w.p), dt * 26).multiplyScalar(Math.exp(-dt * 3)); w.p.addScaledVector(w.v, dt); if (w.p.distanceTo(A) < 0.018 || w.t > 0.45) { w.st = 1; w.u = 0; } }
      else { w.u += dt * w.sp; w.a += dt * 10; if (w.u >= 1) { Z.pl.splice(i, 1); continue; } const rr = w.r * (1 - 0.6 * w.u); w.p.copy(A).addScaledVector(_ax, L * w.u).addScaledVector(_p1, Math.cos(w.a) * rr).addScaledVector(_p2, Math.sin(w.a) * rr); }
    }
    let n = 0; for (const w of Z.pl) { const k = w.st === 0 ? Math.min(1, w.t * 6) : 1 - w.u * 0.8; pos.setXYZ(n, w.p.x, w.p.y, w.p.z); col.setXYZ(n, base.r * k, base.g * k, base.b * k); n++; }
    for (let i = n; i < Z.pN; i++) pos.setXYZ(i, 0, -999, 0); pos.needsUpdate = col.needsUpdate = true;
    const fy = Z.floorY;
    for (let i = Z.cl.length - 1; i >= 0; i--) {
      const b = Z.cl[i]; b.t += dt; if (b.t >= b.life) { Z.cl.splice(i, 1); continue; }
      if (b.fly && b.t > b.fly) { b.v.lerp(_t7.copy(B).sub(b.p).multiplyScalar(6), Math.min(1, dt * 6)); if (b.p.distanceTo(B) < 0.03) { Z.cl.splice(i, 1); continue; } } else b.v.y -= 2.2 * dt;
      b.p.addScaledVector(b.v, dt); if (b.p.y < fy && b.v.y < 0) { b.p.y = fy; b.v.y *= -0.42; b.v.x *= 0.7; b.v.z *= 0.7; } b.r.x += b.w.x * dt; b.r.y += b.w.y * dt;
    }
    Z.cry.count = Z.cl.length; Z.cl.forEach((b, i) => { _q3.setFromEuler(b.r); const s = Math.min(1, (b.life - b.t) * 2) * b.s; _s3.set(s, s, s); _m2.compose(b.p, _q3, _s3); Z.cry.setMatrixAt(i, _m2); }); Z.cry.instanceMatrix.needsUpdate = true;
    for (let i = Z.dl.length - 1; i >= 0; i--) { const d = Z.dl[i]; d.t += dt; if (d.t > d.life) { Z.dl.splice(i, 1); continue; } d.v.y -= 3 * dt; d.p.addScaledVector(d.v, dt); }
    _q3.identity(); Z.drp.count = Z.dl.length; Z.dl.forEach((d, i) => { const s = 1 - d.t / d.life; _s3.set(s, s * 1.6, s); _m2.compose(d.p, _q3, _s3); Z.drp.setMatrixAt(i, _m2); }); Z.drp.instanceMatrix.needsUpdate = true;
    Z.glw.position.copy(A); Z.glw.material.opacity = 0.25 + 0.5 * Z.glow + (Z.fever > 0 ? 0.25 : 0); Z.glw.scale.setScalar(0.05 + 0.06 * Z.glow + 0.03 * Z.I);
    const eg = Z.I > 0.5 ? (Z.I - 0.5) * 1.2 + 0.25 * Z.kick : 0; Z.eyeG.forEach((g, i) => { w2(i ? Z.F.eyeR : Z.F.eyeL, g.position); g.material.opacity = Math.min(0.7, eg); g.scale.setScalar(0.022 + 0.02 * eg); });
  }

  // ---------------- 表情：在原表情上渐变；强度越高越翻白眼 / 吐舌 ----------------
  function dom(base) { let b = 'sad', v = -1; for (const k of ['sad', 'angry', 'surprised', 'happy', 'relaxed']) if ((base[k] || 0) > v) { v = base[k] || 0; b = k; } return v > 0.1 ? b : 'sad'; }
  const _sw = new V3();
  function face(dt, now) {
    const B = Z.base.ex, I = Z.I, T = Object.assign({}, B), add = (k, v) => { T[k] = cl((T[k] || 0) + v, 0, 1); }, hb = Z.hb;
    add(dom(B), 0.3 * I + 0.12 * Z.spasm);
    if (I > 0.3) add('angry', 0.16 * cl((I - 0.3) * 2, 0, 1) * (1 - Z.spasm * 0.5)); if (I > 0.55) add('relaxed', 0.3 * cl((I - 0.55) * 2.2, 0, 1)); if (Z.fever > 0) add('surprised', 0.22);
    T.blink = cl((B.blink || 0) * 0.5 + 0.18 * I + 0.32 * Z.spasm * Math.abs(Math.sin(now * 19)), 0, 0.9);
    if (Z.mode === 'm') { const jw = Z.jaw; T.aa = 0.95 * jw + (B.aa || 0) * (1 - jw); T.oh = 0.45 * jw + (B.oh || 0) * (1 - jw); T.ee = (B.ee || 0) * (1 - jw); T.ih = (B.ih || 0) * (1 - jw); T.ou = (B.ou || 0) * (1 - jw); }
    else T.aa = cl((B.aa || 0) + 0.2 * I + 0.35 * Z.kick, 0, 0.85);
    if (Z.phase === 'end') { const f = cl(Z.endT / 1.5, 0, 1); for (const k in T) if (k !== 'aa' && k !== 'oh') T[k] = lerp(T[k], (B[k] || 0) * 0.6, f); }
    const ch = Z.ch, ex = {};
    for (const k of new Set([...Object.keys(ch), ...Object.keys(T)])) { const rate = (k === 'aa' || k === 'oh') ? 45 : k === 'blink' ? 16 : 3.5; ch[k] = (ch[k] || 0) + ((T[k] || 0) - (ch[k] || 0)) * (1 - Math.exp(-dt * rate)); if (ch[k] > 0.003) ex[k] = ch[k]; }
    hb.setExpression(ex, true);
    const rr = sm(cl((I - 0.32) / 0.45, 0, 1)) * (0.62 + 0.38 * Math.min(1, Z.spasm + Z.kick)) * (Z.phase === 'end' ? 1 - cl(Z.endT / 2, 0, 1) : 1), b0 = Z.base.rl, pat = Z.pat === 'both' ? [1, 1] : Z.pat === 'split' ? [1, -1] : [Z.altS, -Z.altS];
    for (let i = 0; i < 2; i++) { const tr = lerp(b0[i], pat[i] * rr, rr > 0 ? Math.min(1, rr * 1.6) : 0); Z.roll[i] += (tr + Math.sin(now * 31 + i * 2) * 0.12 * Z.kick - Z.roll[i]) * (1 - Math.exp(-dt * 7)); }
    hb.setRoll(cl(Z.roll[0], -1, 1), cl(Z.roll[1], -1, 1));
    const tt = Z.base.tg * 0.04 + sm(cl((I - 0.5) / 0.3, 0, 1)) * (Z.mode === 'n' ? 0.05 : 0.03) * (0.7 + 0.3 * Z.spasm); Z.tg += (tt - Z.tg) * (1 - Math.exp(-dt * 3.2));
    Z.tw += dt * (6 + 22 * Z.spasm); hb.setTongue(Z.tg, Z.tw, 0.3 + 0.7 * (Z.mode === 'm' ? 1 : 0.4));
    if (hb.setSway) hb.setSway(_sw.set(Math.sin(Z.t * 14) * 0.03 * (0.3 + Z.spasm), 0.01 * Z.kick, Math.cos(Z.t * 11) * 0.02 * (0.3 + Z.spasm)));
  }

  // ---------------- 每帧（RecallIW.pre 调用；返回 true＝本帧相机 / 首级 / 手都由这里摆好）----------------
  function frame(dt, now, K) {
    if (!Z) return false; const cam = K.cam, pn = performance.now(), real = cl((pn - Z.wall) / 1000, 0, 0.25); Z.rig = K.rig; dt = Math.min(0.05, dt || 0.016); Z.t += dt; Z.wall = pn;
    Z.E.p.copy(cam.position); Z.E.q.copy(cam.quaternion);
    if (Z.phase === 'play') { tick(real); if (Z.phase === 'play') audio(Z.bt); }
    else if (Z.phase === 'burst') { Z.burstT += dt; if (!Z.bst && Z.burstT > 0.25) { Z.bst = 1; burstCry(110 + 25 * Z.C.r, true, false); drops(30); play('heavy', 0.9, 0.5); try { SFX.coins && SFX.coins(); } catch (e) { } Z.shk = 0.035; } if (Z.burstT > 1.5) end('burst'); }
    else if (Z.phase === 'end') { Z.endT += dt; if (Z.endT > 14) { close(); return false; } }
    Z.kick *= Math.exp(-dt * 8); Z.spasm *= Math.exp(-dt * 2.2); Z.glow *= Math.exp(-dt * 5); Z.ck *= Math.exp(-dt * 7); Z.croll *= Math.exp(-dt * 6); Z.shk *= Math.exp(-dt * 6);
    jitStep(dt); clubStep(dt); director();
    placeHead(); placeClub(); placeFist(); placeClaw(); updFx(dt); face(dt, now); placeCam(cam, dt);
    if (K.rig) K.rig.g.visible = false;
    hud(); drawLane(); return true;
  }

  // ---------------- 卡片信息（F 界面左侧）----------------
  function cardHTML(rec) {
    if (!on() || !rec || !rec.c) return ''; const c = rec.c, C = cfg(c), ck = can(rec), col = COL[C.r], box = `margin-top:10px;padding:8px 10px;border-left:3px solid ${col};background:#ffffff0a`;
    if (c.sip) { const s = c.sip, kn = { done: '榨尽', fail: '木棒卡死', abort: '半途抽出', stop: '收手', burst: '残魂炸开' }[s.k] || ''; return `<div class="sipc" style="${box}"><div style="font-size:12px;letter-spacing:.2em;color:${col}">🪵 汲魂 · 已榨干</div><div style="font-size:12.5px;color:#c9b59c;margin-top:3px">当时拿到 <b style="color:#ffe28a">${s.n || 0}</b> 🔮（${kn}${s.b != null ? ` · 撑过 ${s.b} 拍 · 最高连击 ${s.cb || 0}${s.g ? ' · 评级 ' + s.g : ''}` : ''}）。她的魂只剩一层壳。</div></div>`; }
    const diff = '★'.repeat(C.stars) + '☆'.repeat(5 - C.stars);
    return `<div class="sipc" style="${box}"><div style="font-size:12px;letter-spacing:.2em;color:${col}">🪵 汲魂 · ${esc(EFN[C.r])}</div><div style="font-size:12.5px;color:#d9ccb8;margin-top:3px;line-height:1.6">${ck.ok ? `一次性 · 无尽节奏：只用<b>空格</b>，越往后越快、没有终点。<br>难度 <b style="color:${col}">${diff}</b> · 起速 ♩${C.bpm0} · 残魂 ${C.soul} · 可榨约 <b style="color:#ffe28a">${Math.round(C.soul * 0.6)}~${C.soul * 2}</b> 🔮<br><span style="color:#a89886">失误涨魂压，爆了＝残魂炸开只拿 70%；Esc / F 随时收手拿 100%。${C.r >= 2 ? '撑过 64 拍：想起她的心愿' + (C.r >= 3 ? '；96 拍：魂尘' : '') + '。' : ''}</span>` : `<span style="color:#a89886">🔒 ${esc(ck.why)}</span>`}</div></div>`;
  }
  return { on, can, cfg, begin, frame, end, abort, press, release, close, cardHTML, get active() { return !!Z; }, get phase() { return Z ? Z.phase : ''; }, get info() { return Z; } };
})();
