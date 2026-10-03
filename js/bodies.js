// R72 MOD body_carry（默认开）：野外把被斩首的尸体「🧍 扛走身体」——整具无头身体折进麻袋（占 2×4 格），回洞倒进储物箱。
// 用途：F 回忆 →「余兴」里的身体节目（借尸还魂 / 提线木偶）会用到（不消耗）；储物箱里也可以炼化成骨头、布条和魂尘。
// · 外观沿用解剖台的烘焙（Autopsy.bake：按当前衣着把颜色烘到顶点上），另存每个顶点的 11 段骨骼权重与关节点，
//   洞里重建成 11 根骨的 SkinnedMesh，可以摆姿势。网格存 IndexedDB（与解剖块同库），存档只记归属等元数据；数据不在这台电脑上就用素麻人台代替。
// · 内容边界：只烘原衣着、不提供脱衣；姿势只有日常/滑稽动作（立正、敬礼、投降、鞠躬、跪下……）；只收成年人的身体。
window.Bodies = (() => {
  const on = () => !window.Mods || !Mods.on || Mods.on('body_carry') !== false;
  const T = THREE, V3 = T.Vector3, Q4 = T.Quaternion, S = 18, SZ = [2, 4];
  const G = () => window.G || window.__game;
  const RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
  const toast = (t, c, d) => { try { G().toast(t, c || '#ffd890', d || 2.2); } catch (e) { } };
  const pk = a => a[Math.floor(Math.random() * a.length) % a.length];
  const adult = c => !c || !(+c.age) || +c.age >= 18;

  function defs() { if (!window.Sack || !Sack.def || (Sack.IT && Sack.IT.body)) return; Sack.def('body', { n: '无头身体', icon: '🧍', kind: 'body', w: SZ[0], h: SZ[1], st: 1, rar: 0, desc: '一整具没有头的身体，对折塞在麻袋里。回洞后在储物箱里；F 回忆 →「余兴」的身体节目用得上（不会消耗）。' }); }
  defs();

  // ---------------------------------------------------------------- 野外：扛走
  function canCarry(L) { const fo = L && L.fo; return on() && !!(L && L.kind === 'corpse' && fo && fo.decap && fo.f && fo.f.root && !L.bodyTaken && !L.dissected && !(fo.gone && fo.gone.size) && !fo.halved && adult(fo.h && fo.h.c) && window.Autopsy && Autopsy.bake && window.Foe && Foe.cloneSkinned && window.Sack && Sack.queueBody); }
  function carry(L, rr) {
    if (!canCarry(L)) return false; defs();
    if (!Sack.canAdd(Sack.inv().sack, Sack.mk('body', 1, { sz: SZ.slice() }))) { toast(`麻袋里腾不出 ${SZ[0]}×${SZ[1]} 的空位——一具身体可不小（拖动整理 / 倒掉点东西）`, '#ffb070', 2.8); return true; }
    Sack.queueBody(L, () => finish(L, rr)); rr && rr(); return true;
  }
  function finish(L, rr) {
    if (!canCarry(L)) return; const fo = L.fo, c = (fo.h && fo.h.c) || {}; let rec = null;
    try { const B = Autopsy.bake(Foe.cloneSkinned(fo.f.root), fo.f.look); if (B && B.rig) rec = pack(B); } catch (e) { console.warn('Bodies bake', e); }
    const own = c.name || String(L.name || '').replace(/的尸体$/, '') || '无名者', pid = rec ? 'bd' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36) : '';
    const bd = { pid, own, race: c.raceN || c.race || '', idN: c.idN || '', idk: c.id || '', rar: c.rar | 0, age: c.age || 0, goal: c.goal || '', tr: (c.traits || []).slice(0, 2), loc: c.locN || '', oid: own + '|' + (c.id || ''), h: rec ? rec.h : 1.35, t: Date.now() };
    const it = Sack.mk('body', 1, { bd, sz: SZ.slice() });
    if (!Sack.addTo(Sack.inv().sack, it)) { toast('麻袋放不下了', '#ffb070'); return; }
    if (rec) Autopsy.put(pid, rec);
    L.bodyTaken = true; L.dissected = true; try { fo.f.root.visible = false; } catch (e) { }
    toast(`🧍 你把${own}的无头身体对折、塞进了麻袋（占 ${SZ[0]}×${SZ[1]} 格）。回洞后在储物箱里，「余兴」的身体节目用得上。`, '#ffd890', 3.6);
    try { G().save && G().save(); } catch (e) { } rr && rr();
  }
  // 烘焙结果 → 紧凑记录：身体转到面朝 +Z、髋部在原点上方（左手 = +X），附每顶点 11 段骨骼权重与关节点
  function pack(B) {
    const BN = {}; for (const k in B.BN) BN[k] = B.BN[k].slice(); const g = k => BN[k] ? new V3(...BN[k]) : null;
    const l = (g('leftUpperArm') || new V3(1, 0, 0)).sub(g('rightUpperArm') || new V3(-1, 0, 0)).add((g('leftUpperLeg') || new V3()).sub(g('rightUpperLeg') || new V3())); l.y = 0; if (l.lengthSq() < 1e-6) l.set(1, 0, 0);
    const fw = new V3().crossVectors(l.normalize(), new V3(0, 1, 0)), q = new Q4().setFromAxisAngle(new V3(0, 1, 0), -Math.atan2(fw.x, fw.z)), hp = g('hips') || new V3(), v = new V3();
    const tf = (x, y, z) => v.set(x - hp.x, y, z - hp.z).applyQuaternion(q);
    const sets = [], tex = {}; let tn = 0; const cs = new V3(); let cn = 0; const cpts = [];
    for (const s of B.sets) {
      const V = s.V, n = V.length / S, sk = s.rg && s.rg.sk; if (!sk || sk.length < n * 4 || n < 3) continue;
      if (s.cap === 2) for (let i = 0; i < n; i++) { tf(V[i * S], V[i * S + 1], V[i * S + 2]); cs.add(v); cn++; cpts.push(v.x, v.z); }
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3), U = new Float32Array(n * 2), W = new Float32Array(n), Qc = new Float32Array(n * 2), K = new Float32Array(sk.subarray ? sk.subarray(0, n * 4) : sk.slice(0, n * 4));
      for (let i = 0; i < n; i++) { const o = i * S; tf(V[o], V[o + 1], V[o + 2]); P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z; v.set(V[o + 3], V[o + 4], V[o + 5]).applyQuaternion(q); N[i * 3] = v.x; N[i * 3 + 1] = v.y; N[i * 3 + 2] = v.z; C[i * 3] = V[o + 6]; C[i * 3 + 1] = V[o + 7]; C[i * 3 + 2] = V[o + 8]; U[i * 2] = V[o + 12]; U[i * 2 + 1] = V[o + 13]; W[i] = V[o + 14]; Qc[i * 2] = V[o + 15]; Qc[i * 2 + 1] = V[o + 16]; }
      let tk = null; if (s.map) { const u = Autopsy.texURL(s.map, (s.at || 0) > 0); if (u) { tk = 't' + tn++; tex[tk] = u; } }
      sets.push({ P, N, C, U, W, Q: Qc, K, I: new Uint32Array(s.I), tk, at: s.at || 0 });
    }
    if (!sets.length) return null; let cut = null;
    if (cn > 8) { cs.multiplyScalar(1 / cn); let r = 0; for (let i = 0; i < cpts.length; i += 2) r += Math.hypot(cpts[i] - cs.x, cpts[i + 1] - cs.z); cut = [cs.x, cs.y, cs.z, Math.min(0.08, Math.max(0.03, r / (cpts.length / 2) * 1.15))]; }
    for (const k in BN) { tf(BN[k][0], BN[k][1], BN[k][2]); BN[k] = [v.x, v.y, v.z]; }
    return { v: 1, sets, tex, BN, cut, h: +(cut ? cut[1] : BN.head ? BN.head[1] : BN.neck ? BN.neck[1] + 0.07 : 1.35).toFixed(3) };
  }

  // ---------------------------------------------------------------- 储物箱：列表 / 名字 / 说明 / 菜单
  function list() { try { const I = Sack.inv(), inField = window.Worlds && Worlds.active; return I.stash.concat(inField ? [] : I.sack.items).filter(o => o && o.id === 'body' && o.bd); } catch (e) { return []; } }
  const count = () => on() ? list().length : 0;
  const name = o => `${o.bd.own}的无头身体`;
  const ri = (race, id) => race && id && id.indexOf(String(race).replace(/（.*$/, '')) < 0 ? race + id : (id || race || '');
  const info = o => { const b = o.bd; return `归属：${b.own}（${ri(b.race, b.idN) || '？'} · ${RN[b.rar] || RN[0]}${b.age ? ' · ' + b.age + '岁' : ''}）\n${b.goal ? '她生前想：' + b.goal + '\n' : ''}占 ${SZ[0]}×${SZ[1]} 格 · F 回忆 →「余兴」的身体节目会用到它（不会消耗）${b.pid ? '' : '\n（外观数据不在这台电脑上：节目里会用素麻人台代替）'}`; };
  function menu(o, wild, rr) {
    if (wild) return [];
    return [['炼化（骨头、布条、魂尘）', () => {
      const I = Sack.inv(); for (const L of [I.stash, I.sack.items]) { const i = L.indexOf(o); if (i >= 0) { L.splice(i, 1); break; } }
      const r = o.bd.rar | 0, got = [['bone', 3 + r], ['cloth', 2 + r], ['dust', 3 + 2 * r]]; for (const [id, n] of got) Sack.stashAdd(Sack.mk(id, n));
      if (o.bd.pid && window.Autopsy && Autopsy.del) Autopsy.del(o.bd.pid);
      toast(`炼化「${name(o)}」→ ${got.map(([id, n]) => `${Sack.IT[id] ? Sack.IT[id].n : id}×${n}`).join('、')}`, '#cfb8ff', 2.6); try { G().save(); } catch (e) { } rr && rr();
    }]];
  }
  // 余兴选身体：优先“物归原主”（身体与台上某颗头同属一人），其余随机
  function pickFor(cast, n) {
    const all = list(), out = [], oids = new Set((cast || []).map(r => r && r.c ? (r.c.name || '') + '|' + (r.c.id || '') : ''));
    for (const o of all) if (out.length < n && oids.has(o.bd.oid)) out.push(o);
    for (const o of all.slice().sort(() => Math.random() - 0.5)) if (out.length < n && !out.includes(o)) out.push(o);
    return out;
  }
  function cx(bd) { const I = (window.Lore && Lore.ID && Lore.ID[bd.idk]) || {}, acts = I.act || ['过着平凡的日子']; return { bn: bd.own, bri: ri(bd.race, bd.idN) || '女人', brace: bd.race || '', bid: bd.idN || '', bgoal: bd.goal || '好好活下去', bact: pk(acts), btr: (bd.tr || [])[0] || '倔强', bloc: bd.loc || '某个地方', boid: bd.oid || '' }; }

  // ---------------------------------------------------------------- 洞里：重建可以摆姿势的身体（11 根骨）
  // 骨：0 躯干(含髋/颈) 1/2 左右上臂 3/4 左右前臂+手 5/6 左右大腿 7/8 左右小腿 9/10 左右脚（与解剖台的 11 段权重一一对应）
  const JK = ['hips', 'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot'], PAR = [-1, 0, 0, 1, 2, 0, 0, 5, 6, 7, 8];
  const DL = [[0.18, -1, 0.05], [0.1, -1, 0.15]], DR = [[-0.18, -1, 0.05], [-0.1, -1, 0.15]], UL = [[0.32, 0.95, 0], [0.1, 1, 0.05]], UR = [[-0.32, 0.95, 0], [-0.1, 1, 0.05]], KL = [[0.06, -0.3, 0.95], [0, -1, 0.06]], KR = [[-0.06, -0.3, 0.95], [0, -1, 0.06]], KN = [[0, -1, 0.15], [0, -0.12, -1]];
  // 方向都在“身体空间”：面朝 +Z、左手 = +X、上 = +Y
  const POSE = {
    tpose: {}, stand: { la: DL, ra: DR }, attention: { la: [[0.07, -1, 0], [0.05, -1, 0.04]], ra: [[-0.07, -1, 0], [-0.05, -1, 0.04]] },
    surrender: { la: UL, ra: UR }, raiseL: { la: UL, ra: DR }, raiseR: { la: DL, ra: UR },
    salute: { la: DL, ra: [[-0.8, 0.2, 0.55], [0.72, 0.6, 0.35]] }, wave: { la: DL, ra: [[-0.55, 0.8, 0.05], [-0.15, 1, 0.1]] },
    scarecrow: { la: [[1, -0.05, 0], [0.55, -0.84, 0]], ra: [[-1, -0.05, 0], [-0.55, -0.84, 0]] }, cheer: { la: [[0.4, 0.9, 0.1], [0.15, 1, 0.1]], ra: DR },
    present: { la: [[0.42, -0.5, 0.76], [-0.35, 0.3, 0.89]], ra: [[-0.42, -0.5, 0.76], [0.35, 0.3, 0.89]] }, holdR: { la: DL, ra: [[-0.2, -0.4, 0.9], [0.3, 0.25, 0.92]] },
    bow: { bow: 0.75, la: [[0.1, -1, 0.25], [0.05, -1, 0.2]], ra: [[-0.1, -1, 0.25], [-0.05, -1, 0.2]] },
    slump: { bow: 1.0, lean: 0.12, la: [[0.15, -1, 0.3], [0.05, -1, 0.1]], ra: [[-0.15, -1, 0.3], [-0.05, -1, 0.1]] },
    kneel: { kneel: 1, la: DL, ra: DR, ll: KN, rl: KN }, pray: { kneel: 1, bow: 0.2, la: [[0.15, -0.6, 0.78], [-0.45, 0.55, 0.7]], ra: [[-0.15, -0.6, 0.78], [0.45, 0.55, 0.7]], ll: KN, rl: KN },
    kneeL: { la: DL, ra: DR, ll: KL }, kneeR: { la: DL, ra: DR, rl: KR }
  };
  // 提线木偶：四肢各自“上/下”组合成姿势（两条腿不会同时抬）
  const limbs = s => ({ la: s[0] ? UL : DL, ra: s[1] ? UR : DR, ll: s[2] ? KL : undefined, rl: s[3] ? KR : undefined });
  const nv = a => new V3(a[0], a[1], a[2]).normalize();
  function rig(parts, BN, bd, scale, geos, cut) {
    const g = new T.Group(), inner = new T.Group(); g.add(inner); inner.scale.setScalar(scale || 1);
    const J = JK.map(k => new V3(...(BN[k] || [0, 1, 0]))), bones = J.map(() => new T.Bone());
    bones.forEach((b, i) => { const p = PAR[i]; if (p < 0) { b.position.copy(J[0]); inner.add(b); } else { b.position.copy(J[i]).sub(J[p]); bones[p].add(b); } });
    inner.updateMatrixWorld(true); const skel = new T.Skeleton(bones), meshes = [];
    for (const [geo, mat] of parts) { const m = new T.SkinnedMesh(geo, mat); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.userData.own = 1; inner.add(m); m.bind(skel); meshes.push(m); }
    const tip = (bi, p) => { const o = new T.Object3D(); o.position.copy(p).sub(J[bi]); bones[bi].add(o); return o; };
    const hand = (side, bi) => { const h = BN[side + 'Hand'] ? new V3(...BN[side + 'Hand']) : J[bi].clone().add(J[bi].clone().sub(J[bi - 2]).setLength(0.24)); return h.add(h.clone().sub(J[bi]).setLength(0.05)); };
    const neckP = cut ? new V3(cut[0], cut[1], cut[2]) : BN.head ? new V3(...BN.head) : BN.neck ? new V3(...BN.neck).add(new V3(0, 0.07, 0)) : J[0].clone().add(new V3(0, 0.5, 0));
    const tips = { neck: tip(0, neckP), handL: tip(3, hand('left', 3)), handR: tip(4, hand('right', 4)), kneeL: tip(7, J[7]), kneeR: tip(8, J[8]), chest: tip(0, J[0].clone().lerp(neckP, 0.62).add(new V3(0, 0, 0.1))) };
    const REST = {}; [[1, 3], [2, 4], [5, 7], [7, 9], [6, 8], [8, 10]].forEach(([a, b]) => { REST[a] = J[b].clone().sub(J[a]).normalize(); });
    REST[3] = hand('left', 3).sub(J[3]).normalize(); REST[4] = hand('right', 4).sub(J[4]).normalize();
    const thigh = J[7].distanceTo(J[5]), kneeDrop = Math.max(0, J[0].y - thigh * 0.989 - 0.07);
    function solve(P) {
      const q = bones.map(() => new Q4()), R0 = new Q4().setFromEuler(new T.Euler(P.bow || 0, P.turn || 0, P.lean || 0, 'YXZ')); q[0].copy(R0);
      const chain = (u, l, d, follow) => { const Wu = d && d[0] ? new Q4().setFromUnitVectors(REST[u], nv(d[0])) : follow ? R0.clone() : new Q4(); q[u].copy(R0.clone().invert().multiply(Wu)); const Wl = d && d[1] ? new Q4().setFromUnitVectors(REST[l], nv(d[1])) : Wu.clone(); q[l].copy(Wu.clone().invert().multiply(Wl)); return Wl; };
      chain(1, 3, P.la, true); chain(2, 4, P.ra, true); const wl = chain(5, 7, P.ll, false), wr = chain(6, 8, P.rl, false);
      if (!P.kneel) { q[9].copy(wl.clone().invert()); q[10].copy(wr.clone().invert()); }
      return { q, drop: P.kneel ? kneeDrop : 0 };
    }
    let tgt = solve(POSE.stand), rate = 6, drop = 0;
    const R = {
      g, inner, bones, meshes, BN, J, bd, x: cx(bd), h: neckP.y * (scale || 1), neckR: cut ? cut[3] : 0.05, tips, fallback: !geos,
      pose(p, r) { const P = typeof p === 'string' ? POSE[p] : Array.isArray(p) ? limbs(p) : p; tgt = solve(P || POSE.stand); rate = r || 6; return R; },
      snap() { bones.forEach((b, i) => b.quaternion.copy(tgt.q[i])); drop = tgt.drop; bones[0].position.y = J[0].y - drop; g.updateMatrixWorld(true); return R; },
      update(dt) { const k = 1 - Math.exp(-dt * rate); bones.forEach((b, i) => b.quaternion.slerp(tgt.q[i], k)); drop += (tgt.drop - drop) * k; bones[0].position.y = J[0].y - drop; g.updateMatrixWorld(true); },
      // 世界坐标里的挂点：neck / handL / handR / hands（双手中点）/ kneeL / kneeR / chest；q = 躯干朝向
      tip(kind, p, q) { if (kind === 'hands') { tips.handL.getWorldPosition(p); p.add(tips.handR.getWorldPosition(_t)).multiplyScalar(0.5); } else (tips[kind] || tips.neck).getWorldPosition(p); if (q) bones[0].getWorldQuaternion(q); return p; },
      dispose() { g.traverse(o => { if (!o.isMesh) return; try { o.geometry.dispose(); [].concat(o.material).forEach(x => x && x.dispose()); } catch (e) { } }); }
    };
    R.snap(); return R;
  }
  const _t = new V3();
  function fromRec(rec, bd) {
    const tex = {}; for (const k in rec.tex) { const t = new T.TextureLoader().load(rec.tex[k]); t.flipY = false; t.encoding = T.sRGBEncoding; t.anisotropy = 2; tex[k] = t; }
    const parts = rec.sets.map(s => {
      const geo = new T.BufferGeometry(), n = s.P.length / 3, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { const w1 = s.K[i * 4 + 1], w2 = s.K[i * 4 + 3], ws = w1 + w2 || 1; si[i * 4] = s.K[i * 4] | 0; si[i * 4 + 1] = s.K[i * 4 + 2] | 0; sw[i * 4] = w1 / ws; sw[i * 4 + 1] = w2 / ws; }
      geo.setAttribute('position', new T.BufferAttribute(s.P, 3)); geo.setAttribute('normal', new T.BufferAttribute(s.N, 3)); geo.setAttribute('color', new T.BufferAttribute(s.C, 3)); geo.setAttribute('uv', new T.BufferAttribute(s.U, 2)); geo.setAttribute('tw', new T.BufferAttribute(s.W, 1)); geo.setAttribute('cp', new T.BufferAttribute(s.Q, 2));
      geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4)); geo.setIndex(new T.BufferAttribute(s.I, 1)); geo.computeBoundingSphere();
      return [geo, Autopsy.mkMat(s.tk ? tex[s.tk] : null, s.at)];
    });
    const R = rig(parts, rec.BN, bd, 1, true, rec.cut); R.tex = tex; const d0 = R.dispose; R.dispose = () => { d0(); for (const k in tex) tex[k].dispose(); }; return R;
  }
  // 素麻人台（身体数据不在这台电脑上 / 测试台）：同一套 11 根骨，胶囊拼成，裁缝店人台的颜色
  const FBN = { hips: [0, 0.95, 0], neck: [0, 1.42, 0], head: [0, 1.49, 0], leftUpperArm: [0.17, 1.37, 0], rightUpperArm: [-0.17, 1.37, 0], leftLowerArm: [0.43, 1.37, 0], rightLowerArm: [-0.43, 1.37, 0], leftHand: [0.66, 1.37, 0], rightHand: [-0.66, 1.37, 0], leftUpperLeg: [0.09, 0.92, 0], rightUpperLeg: [-0.09, 0.92, 0], leftLowerLeg: [0.09, 0.5, 0.01], rightLowerLeg: [-0.09, 0.5, 0.01], leftFoot: [0.09, 0.08, 0], rightFoot: [-0.09, 0.08, 0], leftToes: [0.09, 0.02, 0.13], rightToes: [-0.09, 0.02, 0.13] };
  function fallback(bd) {
    const B = FBN, P = [], N = [], C = [], SI = [], SW = [], m4 = new T.Matrix4(), q = new Q4(), c = new T.Color(), v = new V3(), nn = new V3();
    const put = (geo, mat, gi, col) => { const g2 = geo.index ? geo.toNonIndexed() : geo; g2.applyMatrix4(mat); const p = g2.attributes.position, n = g2.attributes.normal; c.set(col); for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); C.push(c.r, c.g, c.b); SI.push(gi, 0, 0, 0); SW.push(1, 0, 0, 0); } };
    const seg = (a, b, r0, r1, gi, col) => { const A = new V3(...B[a]), Bv = new V3(...B[b]), d = Bv.clone().sub(A), L = d.length(); q.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); m4.compose(A.clone().lerp(Bv, 0.5), q, new V3(1, 1, 1)); put(new T.CylinderGeometry(r1, r0, L, 12, 1), m4, gi, col); };
    const ball = (k, r, gi, col, sy) => { m4.compose(new V3(...B[k]), q.identity(), new V3(1, sy || 1, 1)); put(new T.SphereGeometry(r, 12, 8), m4, gi, col); };
    const LIN = '#a89878', DK = '#5a4a38', TU = '#2a1c34', COL = '#6a5a7a';
    seg('hips', 'neck', 0.15, 0.12, 0, TU); ball('hips', 0.15, 0, TU, 0.7); ball('neck', 0.12, 0, TU, 0.5); seg('neck', 'head', 0.05, 0.048, 0, LIN);
    m4.compose(new V3(0, 1.4, 0), q.identity(), new V3(1, 1, 1)); put(new T.TorusGeometry(0.075, 0.018, 6, 16).rotateX(Math.PI / 2), m4, 0, COL);
    m4.compose(new V3(0, 0.78, 0), q.identity(), new V3(1, 1, 0.85)); put(new T.CylinderGeometry(0.16, 0.27, 0.42, 16, 1, true), m4, 0, TU);
    m4.compose(new V3(...B.head), q.identity(), new V3(1, 1, 1)); put(new T.CylinderGeometry(0.049, 0.049, 0.008, 12), m4, 0, '#7a1a1e');
    seg('leftUpperArm', 'rightUpperArm', 0.06, 0.06, 0, TU);
    for (const s of ['left', 'right']) { const o = s === 'left' ? 0 : 1; ball(s + 'UpperArm', 0.058, 1 + o, TU); seg(s + 'UpperArm', s + 'LowerArm', 0.05, 0.045, 1 + o, TU); ball(s + 'LowerArm', 0.044, 3 + o, LIN); seg(s + 'LowerArm', s + 'Hand', 0.043, 0.036, 3 + o, LIN); ball(s + 'Hand', 0.045, 3 + o, DK, 1.2);
      ball(s + 'UpperLeg', 0.085, 5 + o, TU); seg(s + 'UpperLeg', s + 'LowerLeg', 0.08, 0.06, 5 + o, TU); ball(s + 'LowerLeg', 0.06, 7 + o, DK); seg(s + 'LowerLeg', s + 'Foot', 0.058, 0.045, 7 + o, DK); seg(s + 'Foot', s + 'Toes', 0.05, 0.04, 9 + o, DK); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(C, 3)); geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(SI, 4)); geo.setAttribute('skinWeight', new T.Float32BufferAttribute(SW, 4)); geo.computeBoundingSphere();
    return rig([[geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 })]], B, bd || { own: '无名者', oid: '' }, 0.93, false);
  }
  function load(it) { const bd = it && it.bd; if (!bd || !bd.pid || !window.Autopsy || !Autopsy.get) return Promise.resolve(fallback(bd)); return Autopsy.get(bd.pid).then(rec => { try { return rec && rec.sets ? fromRec(rec, bd) : fallback(bd); } catch (e) { console.warn('Bodies build', e); return fallback(bd); } }).catch(() => fallback(bd)); }

  return { on, SZ, POSE, limbs, canCarry, carry, list, count, name, info, menu, pickFor, cx, load, fallback, fromRec, pack };
})();
