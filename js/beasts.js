// 第二十二轮：野兽（MOD beasts，默认开）——荒野里的狼/狐/野牛/白角鹿：不掉首级，掉兽皮·生肉·兽牙·兽角等材料（尸骸可搜刮）。
// 模型：Quaternius「Ultimate Animated Animals」（CC0），见 beasts/LICENSE.txt；beasts/<名>.js 为 base64 GLB（按需加载，file:// 可用）。
// 与 foe.js 互不依赖：worlds.js 在 buildNode 后调用 Beasts.spawn，每帧 Beasts.update，命中判定走 Beasts.targets（与 Foe.targets 同格式）。
window.Beasts = (() => {
  const V3 = THREE.Vector3, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a);
  const ang = a => Math.atan2(Math.sin(a), Math.cos(a));
  // ai: pack 群狼绕圈扑咬 / hitrun 咬一口就跑 / charger 蓄力冲撞 / skittish 受惊逃跑，逼到墙角才踢
  const TYPES = {
    wolf: { n: '灰狼', ico: '🐺', file: 'wolf', h: 0.85, hp: 34, walk: 1.7, run: 6.2, dash: 10.5, ai: 'pack', dmg: 0.05, reach: 1.55, aggro: 17, r: 0.62, pack: [2, 3], w: 0.42,
      tints: [[1.9, 1.85, 1.7], [2.8, 2.7, 2.6], [1.1, 1.1, 1.2], [2.5, 1.8, 1.2]], say: ['🐺 狼群盯上了你', '🐺 低吼声从四面传来'],
      drops: [['hide', 1, 2, 0.85], ['meat', 1, 2, 0.9], ['fang', 1, 2, 0.7], ['bone', 1, 1, 0.35]] },
    fox: { n: '赤狐', ico: '🦊', file: 'fox', h: 0.55, hp: 18, walk: 1.9, run: 7.0, dash: 11, ai: 'hitrun', dmg: 0.03, reach: 1.25, aggro: 12, r: 0.45, pack: [1, 2], w: 0.22, tints: [[1, 1, 1], [0.7, 0.7, 0.75], [1.3, 1.3, 1.3]],
      say: ['🦊 灌木丛里有双眼睛在闪'], drops: [['hide', 1, 1, 0.8], ['meat', 1, 1, 0.8], ['fang', 1, 1, 0.3], ['cloth', 1, 1, 0.15]] },
    bull: { n: '野牛', ico: '🐂', file: 'bull', h: 1.55, hp: 90, walk: 1.5, run: 4.0, dash: 9.5, ai: 'charger', dmg: 0.14, reach: 1.9, aggro: 9, r: 0.95, pack: [1, 1], w: 0.18, tints: [[2.4, 1.9, 1.5], [1.3, 1.15, 1.0], [3.2, 2.8, 2.4]],
      say: ['🐂 野牛刨着地，鼻孔喷出白气'], drops: [['hide', 2, 3, 0.95], ['meat', 2, 3, 0.95], ['horn', 1, 2, 0.75], ['bone', 1, 2, 0.5]] },
    stag: { n: '白角鹿', ico: '🦌', file: 'stag', h: 1.5, hp: 48, walk: 1.6, run: 7.4, dash: 8.5, ai: 'skittish', dmg: 0.07, reach: 2.0, aggro: 13, r: 0.85, pack: [1, 1], w: 0.18, tints: [[1, 1, 1], [1.5, 1.5, 1.5], [0.7, 0.65, 0.6]],
      say: ['🦌 一头白角鹿抬起头，耳朵转向了你'], drops: [['hide', 1, 2, 0.9], ['meat', 2, 3, 0.9], ['horn', 1, 1, 0.55], ['bone', 1, 1, 0.3]] }
  };
  const LOADED = {}; let C = null, BS = [], IDS = 0, gRoot = null;
  const b64buf = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  function loadType(k) {
    return LOADED[k] || (LOADED[k] = new Promise((res, rej) => {
      const done = () => { try { new THREE.GLTFLoader().parse(b64buf(window.BEAST_GLB[k]), '', g => { const box = new THREE.Box3().setFromObject(g.scene); res({ scene: g.scene, clips: g.animations, minY: box.min.y, hgt: Math.max(0.1, box.max.y - box.min.y) }); }, rej); } catch (e) { rej(e); } };
      if (window.BEAST_GLB && BEAST_GLB[k]) return done();
      const s = document.createElement('script'); s.src = 'beasts/' + TYPES[k].file + '.js'; s.onload = done; s.onerror = () => rej(new Error('beast ' + k)); document.head.appendChild(s);
    }));
  }
  function cloneSkinned(src) { // 与 Foe.cloneSkinned 相同的按名字重绑（three r147 无 SkeletonUtils）
    const clone = src.clone(true), map = {}; clone.traverse(o => { map[o.name] = o; });
    const sm = [], dm = []; src.traverse(o => { if (o.isSkinnedMesh) sm.push(o); }); clone.traverse(o => { if (o.isSkinnedMesh) dm.push(o); });
    dm.forEach((m, i) => { const s = sm[i]; m.bind(new THREE.Skeleton(s.skeleton.bones.map(b => map[b.name]), s.skeleton.boneInverses), s.bindMatrix); m.material = Array.isArray(s.material) ? s.material.map(x => x.clone()) : s.material.clone(); m.frustumCulled = false; });
    return clone;
  }
  const mulberry = (a) => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  // ---- 布置：每个地点由种子决定有无野兽、种类与数量；被杀的不再刷新 ----
  function plan(node) {
    if (node.bst) return node.bst;
    const r = mulberry((node.seed ^ 0x7f4a7c15) >>> 0), list = [];
    if (!node.home && !node.boss && r() < 0.72) {
      const budget = ({ s: 1, m: 2, l: 3 }[node.size] || 2) + (r() < 0.35 ? 1 : 0);
      let tot = 0; const ws = Object.entries(TYPES);
      while (tot < budget && list.length < 6) {
        let x = r() * ws.reduce((a, [, t]) => a + t.w, 0), k = 'wolf'; for (const [kk, t] of ws) { if ((x -= t.w) <= 0) { k = kk; break; } }
        const T = TYPES[k], n = T.pack[0] + Math.floor(r() * (T.pack[1] - T.pack[0] + 1)), tint = Math.floor(r() * T.tints.length);
        for (let i = 0; i < n; i++) list.push({ k, tint, alive: true, seed: (r() * 1e9) | 0 }); tot += k === 'wolf' ? 2 : 1;
      }
    }
    return node.bst = { list };
  }
  async function spawn(ctx, node) {
    clear(); C = ctx; const P = plan(node), want = P.list.filter(e => e.alive); if (!want.length) return 0;
    const types = [...new Set(want.map(e => e.k))]; await Promise.all(types.map(loadType));
    gRoot = new THREE.Group(); gRoot.name = 'beasts'; C.sc.add(gRoot); const rec = (node.loc && node.loc.rec) || 40;
    // 同群靠在一起
    const packAt = {};
    for (const e of want) {
      const M = await loadType(e.k), T = TYPES[e.k]; let at = packAt[e.k + e.tint];
      if (!at) { at = packAt[e.k + e.tint] = C.spot(); let g = 0; while (g++ < 12 && Math.hypot(at.x - C.pos().x, at.z - C.pos().z) < 14) at = packAt[e.k + e.tint] = C.spot(); }
      const rr = mulberry(e.seed), x = at.x + (rr() - 0.5) * 3.2, z = at.z + (rr() - 0.5) * 3.2;
      const root = cloneSkinned(M.scene), s = T.h / M.hgt, model = new THREE.Group(), g = new THREE.Group(); model.add(root); model.scale.setScalar(s); model.position.y = -M.minY * s; g.add(model);
      const tn = T.tints[e.tint], mats = []; root.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.color) { m.color.setRGB(Math.min(1, m.color.r * tn[0]), Math.min(1, m.color.g * tn[1]), Math.min(1, m.color.b * tn[2])); m.metalness = 0; m.roughness = 0.85; if (m.emissive) m.emissive.setRGB(0.02, 0.02, 0.02); mats.push(m); } }); });
      g.position.set(x, C.H(x, z), z); g.rotation.y = rr() * 6.28; gRoot.add(g);
      const mixer = new THREE.AnimationMixer(root), acts = {}; M.clips.forEach(c => { acts[c.name] = mixer.clipAction(c); });
      const hpM = 1 + Math.min(2.2, Math.sqrt(rec / 60) * 0.55);
      const b = { id: 'bst' + (++IDS), e, k: e.k, T, g, model, mixer, acts, mats, pos: g.position, yaw: g.rotation.y, hp: Math.round(T.hp * hpM), maxHp: Math.round(T.hp * hpM), alive: true, state: 'idle', t: rnd(0, 2), cd: rnd(0.5, 2), stun: 0, broken: 0, flash: 0, cur: '', lookT: rnd(1, 4), tgt: null, side: rr() < 0.5 ? 1 : -1, stuck: 0, lastP: new V3(x, 0, z), provoked: false, noticed: false, hitDone: false, lootAt: 0, tint: e.tint,
        stub: { pos: g.position, boss: null, broken: 0, stag: 0, rar: 1, h: { c: { name: T.n } }, f: { play() { } }, anchor: { pos: g.position }, dead: false, sayT: 99, atk: null, seen: true, state: 'chase', hp: 1, maxHp: 1 } };
      play(b, 'Idle', { fade: 0 }); if (acts.Idle) acts.Idle.time = rnd(0, 2); BS.push(b);
    }
    return BS.length;
  }
  function clear() { if (gRoot && gRoot.parent) { gRoot.traverse(o => { if (o.isMesh) { o.geometry.dispose && 0; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose && m.dispose()); } }); gRoot.parent.remove(gRoot); } gRoot = null; BS.forEach(b => b.mixer.stopAllAction()); BS = []; }
  function play(b, name, o = {}) {
    const a = b.acts[name]; if (!a) return null; if (b.cur === name && !o.restart) return a;
    const prev = b.acts[b.cur]; a.reset(); a.setLoop(o.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = !!o.once; a.setEffectiveTimeScale(o.speed || 1); a.setEffectiveWeight(1);
    a.play(); if (prev && prev !== a) prev.crossFadeTo(a, o.fade == null ? 0.18 : o.fade, false); b.cur = name; return a;
  }

  // ---- 移动：朝目标转向 + 沿碰撞体滑动 + 卡住时侧滑 ----
  function steer(b, tx, tz, spd, dt, turn = 9) {
    const P = b.pos; let dx = tx - P.x, dz = tz - P.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    // 前方障碍：绕开（向障碍外侧偏）
    const ax = P.x + dx * 1.6, az = P.z + dz * 1.6;
    for (const c of C.cols) { if (c.r < 0.35) continue; const cx = c.x - ax, cz = c.z - az, dd = Math.hypot(cx, cz); if (dd < c.r + 0.7) { const sgn = (dx * (c.z - P.z) - dz * (c.x - P.x)) > 0 ? -1 : 1; dx += -dz * sgn * 0.9; dz += dx * sgn * 0.9 * 0; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; break; } }
    if (b.stuck > 0.5) { const s = b.side; const ox = -dz * s, oz = dx * s; dx = dx * 0.4 + ox; dz = dz * 0.4 + oz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
    const want = Math.atan2(dx, dz); b.yaw += clamp(ang(want - b.yaw), -turn * dt, turn * dt); b.g.rotation.y = b.yaw;
    const sp = spd * Math.max(0.25, Math.cos(clamp(ang(want - b.yaw), -1.4, 1.4)));
    move(b, Math.sin(b.yaw) * sp * dt, Math.cos(b.yaw) * sp * dt);
  }
  function move(b, mx, mz) {
    const P = b.pos; P.x += mx; P.z += mz;
    for (const c of C.cols) { const dx = P.x - c.x, dz = P.z - c.z, d = Math.hypot(dx, dz), m = c.r + b.T.r * 0.55; if (d < m && d > 1e-4) { P.x = c.x + dx / d * m; P.z = c.z + dz / d * m; b.hitWall = true; } }
    const R = C.R * 0.96, rr = Math.hypot(P.x, P.z); if (rr > R) { P.x *= R / rr; P.z *= R / rr; b.hitWall = true; }
    for (const d of (C.doors || [])) { const dx = P.x - d.x, dz = P.z - d.z, dd = Math.hypot(dx, dz); if (dd < 2.2 && dd > 1e-4) { P.x = d.x + dx / dd * 2.2; P.z = d.z + dz / dd * 2.2; } } // 野兽不进门
    P.y = C.H(P.x, P.z);
  }
  function face(b, x, z, dt, turn = 10) { b.yaw += clamp(ang(Math.atan2(x - b.pos.x, z - b.pos.z) - b.yaw), -turn * dt, turn * dt); b.g.rotation.y = b.yaw; }

  // ---- 伤害玩家 ----
  function bite(b, frac, o = {}) {
    const s = C.st(), n = Math.max(1, Math.round(s.maxHp * frac * rnd(0.85, 1.15) * (o.heavy ? 1.5 : 1)));
    b.stub.broken = 0; b.stub.stag = 0; C.hitPlayer(b.stub, n, { ang: o.ang != null ? o.ang : [-2.2, -0.7, 0.7, 2.2, 1.57][Math.floor(Math.random() * 5)], heavy: !!o.heavy, thrust: false });
    if (b.stub.stag > 0.3 || b.stub.broken > 0) { b.stun = Math.max(b.stun, b.stub.stag || 0.8); b.broken = Math.max(b.broken, b.stub.broken || 0.9); b.state = 'stun'; b.t = 0; play(b, 'Idle_HitReact1', { once: true, restart: true, fade: 0.05 }); }
  }
  function notice(b, P) {
    if (b.noticed) return; b.noticed = true; const T = b.T;
    if (!C.noticed || !C.noticed[b.k + b.tint]) { (C.noticed = C.noticed || {})[b.k + b.tint] = 1; C.toast && C.toast(T.say[Math.floor(Math.random() * T.say.length)], '#ffc890', 2.2); window.SFX && SFX.roar && SFX.roar(0.35); }
  }
  const attackers = () => BS.filter(o => o.alive && (o.state === 'lunge')).length;

  // ---- 每帧 ----
  function update(dt, now) {
    if (!BS.length || !C) return; const P = C.pos();
    for (const b of BS) {
      const dx = P.x - b.pos.x, dz = P.z - b.pos.z, d = Math.hypot(dx, dz);
      if (d < 55 || !b.alive) b.mixer.update(dt);
      if (b.flash > 0) { b.flash -= dt; const f = Math.max(0, b.flash / 0.12) * 0.7; b.mats.forEach(m => m.emissive && m.emissive.setRGB(0.02 + f, 0.02, 0.02)); }
      if (!b.alive) { if (b.lootAt && now > b.lootAt) { b.lootAt = 0; if (window.Sack && Sack.carcass) Sack.carcass(b, C.W()); } continue; }
      if (d > 80) continue; b.t += dt; b.cd -= dt; b.stun -= dt; if (b.broken > 0) b.broken -= dt;
      // 卡住检测
      const mv = Math.hypot(b.pos.x - b.lastP.x, b.pos.z - b.lastP.z); b.lastP.set(b.pos.x, 0, b.pos.z);
      if (['stalk', 'chase', 'flee'].includes(b.state) && mv < 0.15 * dt * 6 && d > 2) { b.stuck += dt; if (b.stuck > 1.6) { b.side = -b.side; b.stuck = 0.5 + 0.0; } } else b.stuck = Math.max(0, b.stuck - dt * 2);
      if (b.state === 'stun') { if (b.stun <= 0) { b.state = b.k === 'bull' ? 'paw' : b.k === 'stag' ? 'fight' : b.k === 'fox' ? 'chase' : 'stalk'; b.hitDone = false; b.t = 0; b.cd = 0.4; } continue; }
      if (b.stun > 0 && b.state !== 'charge') continue;
      if (d < 0.85 && d > 1e-4 && b.state !== 'charge') { b.pos.x -= dx / d * (0.85 - d); b.pos.z -= dz / d * (0.85 - d); } // 不重叠在玩家身上
      ({ pack: aiPack, hitrun: aiHitrun, charger: aiCharger, skittish: aiSkittish })[b.T.ai](b, dt, P, d, dx, dz);
    }
  }
  const seesP = (b, maxD) => C.sees(b.pos, maxD);
  function aiPack(b, dt, P, d, dx, dz) {
    const T = b.T;
    if (b.state === 'idle') { // 巡游
      play(b, b.t % 6 < 3 ? 'Walk' : 'Idle'); if (b.t % 6 < 3) { b.lookT -= dt; if (b.lookT <= 0) { b.lookT = rnd(2, 5); b.tgt = { x: b.pos.x + rnd(-6, 6), z: b.pos.z + rnd(-6, 6) }; } if (b.tgt) steer(b, b.tgt.x, b.tgt.z, T.walk, dt, 3); }
      if (b.provoked || (d < T.aggro && seesP(b, T.aggro)) || BS.some(o => o !== b && o.alive && o.k === b.k && o.state !== 'idle' && Math.hypot(o.pos.x - b.pos.x, o.pos.z - b.pos.z) < 12)) { notice(b, P); b.state = 'stalk'; b.t = 0; b.cd = rnd(1.4, 3.4); b.ring = Math.atan2(b.pos.x - P.x, b.pos.z - P.z); b.dir = b.side; }
      return;
    }
    if (b.state === 'stalk') { // 绕圈逼近，目光不离开你
      const R = 3.6 + (b.id.length % 3) * 0.7; b.ring += b.dir * dt * 0.55; const tx = P.x + Math.sin(b.ring) * R, tz = P.z + Math.cos(b.ring) * R;
      if (d > R + 4) { play(b, 'Gallop'); steer(b, P.x, P.z, T.run, dt); } else { play(b, 'Walk', { speed: 1.4 }); steer(b, tx, tz, T.walk * 1.7, dt, 7); if (d < R + 1.5) { b.ring = Math.atan2(b.pos.x - P.x, b.pos.z - P.z) + b.dir * 0.02; } }
      if (b.cd <= 0 && attackers() < 2 && d < 9 && seesP(b, 10)) { b.state = 'lunge'; b.t = 0; b.hitDone = false; b.lockX = P.x; b.lockZ = P.z; play(b, 'Idle_HitReact1', { once: true, restart: true, fade: 0.08, speed: 1.6 }); }
      if (d > T.aggro * 2.2) { b.state = 'idle'; b.noticed = false; }
      return;
    }
    if (b.state === 'lunge') { // 伏低 0.5s → 扑出
      if (b.t < 0.5) { face(b, P.x, P.z, dt, 14); b.lockX = P.x; b.lockZ = P.z; steer(b, P.x, P.z, 1.2, dt, 14); }
      else if (b.t < 1.05) { if (b.t - dt < 0.5) play(b, 'Attack', { once: true, restart: true, fade: 0.05, speed: 1.3 }); const ddx = b.lockX - b.pos.x, ddz = b.lockZ - b.pos.z, dd = Math.hypot(ddx, ddz); move(b, ddx / (dd || 1) * T.dash * dt * (dd > 0.4 ? 1 : 0.3), ddz / (dd || 1) * T.dash * dt * (dd > 0.4 ? 1 : 0.3)); b.yaw = Math.atan2(ddx, ddz); b.g.rotation.y = b.yaw;
        if (!b.hitDone && d < T.reach + 0.35) { b.hitDone = true; bite(b, T.dmg); } }
      else { b.state = 'stalk'; b.t = 0; b.cd = rnd(1.6, 3.6); b.dir = -b.dir; }
      return;
    }
  }
  function aiHitrun(b, dt, P, d) { // 狐：突然一口，然后跑开绕圈
    const T = b.T;
    if (b.state === 'idle') { play(b, b.t % 5 < 2 ? 'Walk' : 'Idle'); if (b.t % 5 < 2) steer(b, b.pos.x + Math.sin(b.t) * 3, b.pos.z + Math.cos(b.t * 1.3) * 3, T.walk, dt, 3);
      if (b.provoked || (d < T.aggro && seesP(b, T.aggro))) { notice(b, P); b.state = 'chase'; b.t = 0; } return; }
    if (b.state === 'chase') { play(b, 'Gallop'); steer(b, P.x, P.z, T.run, dt); if (d < T.reach + 0.5) { b.state = 'bite'; b.t = 0; b.hitDone = false; play(b, 'Attack', { once: true, restart: true, fade: 0.05, speed: 1.4 }); } return; }
    if (b.state === 'bite') { face(b, P.x, P.z, dt, 14); if (b.t > 0.28 && !b.hitDone) { b.hitDone = true; if (d < T.reach + 0.6) bite(b, T.dmg); } if (b.t > 0.7) { b.state = 'flee'; b.t = 0; b.fleeA = Math.atan2(b.pos.x - P.x, b.pos.z - P.z) + rnd(-0.8, 0.8); } return; }
    if (b.state === 'flee') { play(b, 'Gallop'); steer(b, b.pos.x + Math.sin(b.fleeA) * 6, b.pos.z + Math.cos(b.fleeA) * 6, T.run, dt); if (b.t > 1.6 + rnd(0, 0.01)) { b.state = 'chase'; b.t = 0; } }
  }
  function aiCharger(b, dt, P, d) { // 野牛：不惹不动；靠近或挨打后刨地、直线冲撞，撞完喘息（破绽 = 双倍伤害）
    const T = b.T;
    if (b.state === 'idle') { play(b, 'Idle'); if (b.t % 8 < 2.5) { b.lookT -= dt; if (b.lookT <= 0) { b.lookT = rnd(2, 4); b.tgt = { x: b.pos.x + rnd(-4, 4), z: b.pos.z + rnd(-4, 4) }; } if (b.tgt) { play(b, 'Walk'); steer(b, b.tgt.x, b.tgt.z, T.walk, dt, 2); } }
      if (b.provoked || (d < T.aggro && seesP(b, T.aggro))) { notice(b, P); b.state = 'paw'; b.t = 0; b.hitDone = false; } return; }
    if (b.state === 'paw') { play(b, 'Idle_HitReact1', { speed: 0.7 }); face(b, P.x, P.z, dt, 5); b.lockX = P.x; b.lockZ = P.z; if (b.t > 1.05) { b.state = 'charge'; b.t = 0; b.hitDone = false; const l = Math.hypot(P.x - b.pos.x, P.z - b.pos.z) || 1; b.cx = (P.x - b.pos.x) / l; b.cz = (P.z - b.pos.z) / l; b.hitWall = false; play(b, 'Gallop', { speed: 1.15 }); } return; }
    if (b.state === 'charge') { b.yaw = Math.atan2(b.cx, b.cz); b.g.rotation.y = b.yaw; move(b, b.cx * T.dash * dt, b.cz * T.dash * dt);
      if (!b.hitDone && d < T.reach) { b.hitDone = true; bite(b, T.dmg, { heavy: true, ang: 1.57 }); }
      if (b.hitWall || b.t > 1.5 || b.hitDone && b.t > 0.4) { b.state = 'stun'; b.stun = b.hitWall ? 2.4 : 1.5; b.broken = b.stun; b.t = 0; play(b, 'Idle_HitReact1', { once: true, restart: true }); C.toast && b.hitWall && C.toast('💥 野牛撞在了障碍上——趁现在砍！', '#ffe0a0', 1.4); } return; }
    if (b.state === 'fight') { b.state = 'paw'; }
  }
  function aiSkittish(b, dt, P, d) { // 鹿：见人就跑，被逼到角落或受伤后才踢
    const T = b.T;
    if (b.state === 'idle') { play(b, b.t % 7 < 2 ? 'Walk' : 'Idle'); if (b.t % 7 < 2) steer(b, b.pos.x + Math.sin(b.t) * 3, b.pos.z + Math.cos(b.t * 0.8) * 3, T.walk, dt, 3);
      if (b.provoked || (d < T.aggro && seesP(b, T.aggro))) { notice(b, P); b.state = b.provoked ? 'fight' : 'flee'; b.t = 0; } return; }
    if (b.state === 'flee') { play(b, 'Gallop'); const a = Math.atan2(b.pos.x - P.x, b.pos.z - P.z); steer(b, b.pos.x + Math.sin(a) * 8, b.pos.z + Math.cos(a) * 8, T.run, dt);
      if (b.stuck > 0.9 && d < 4.5) { b.state = 'fight'; b.t = 0; } if (d > T.aggro * 2) { b.state = 'idle'; b.noticed = false; } return; }
    if (b.state === 'fight') { play(b, d > T.reach + 0.6 ? 'Gallop' : 'Walk'); face(b, P.x, P.z, dt, 9); if (d > T.reach + 0.3) steer(b, P.x, P.z, T.run * 0.7, dt);
      if (d < T.reach + 0.3 && b.cd <= 0) { b.state = 'kick'; b.t = 0; b.hitDone = false; play(b, 'Attack', { once: true, restart: true, fade: 0.05 }); } return; }
    if (b.state === 'kick') { face(b, P.x, P.z, dt, 8); if (b.t > 0.45 && !b.hitDone) { b.hitDone = true; if (d < T.reach + 0.6) bite(b, T.dmg); } if (b.t > 1.0) { b.state = 'fight'; b.cd = rnd(1.2, 2.2); } }
  }

  // ---- 被砍 ----
  function targets() {
    const out = []; for (const b of BS) { if (!b.alive) continue; const p = b.pos.clone(); p.y += b.T.h * 0.55; out.push({ id: b.id, pos: p, r: b.T.r, kind: 'foe', onHit: (info) => hit(b, info) }); } return out;
  }
  function hit(b, info) {
    if (!b.alive || !C) return false; const slash = info.kind !== 'thrust', sp = Math.max(0.5, Math.min(1.8, (info.speed || 5) / 8));
    const q = C.power(b.stub), mult = (b.broken > 0 ? 2 : 1) * (info.charged ? 2.2 : 1) * (info.mult || 1);
    const dealt = Math.max(1, Math.round(12 * q * sp * mult * (slash ? 1 : 0.8) * rnd(0.85, 1.15)));
    b.hp -= dealt; b.flash = 0.12; b.provoked = true; const fp = b.pos.clone(); fp.y += b.T.h * 0.8; C.floatDmg(fp, dealt, sp > 1.2 || b.broken > 0);
    { const kv = (info.vel || new V3()).clone(); kv.y = 0; if (kv.lengthSq() > 1e-4) { kv.normalize().multiplyScalar((b.k === 'bull' ? 0.1 : 0.28) * sp); move(b, kv.x, kv.z); } }
    C.event && C.event('hit', b.stub, { dealt, zone: 'body', brk: b.broken > 0 });
    window.SFX && (SFX.chop && SFX.chop(), SFX.squish && SFX.squish(0.5)); window.Foe && Foe.spark && Foe.spark(info.point || fp, 5, 'red');
    if (b.hp <= 0) { die(b, info); return true; }
    if (b.state === 'idle' || b.state === 'flee' && b.k !== 'stag') { b.state = b.k === 'wolf' ? 'stalk' : b.k === 'bull' ? 'paw' : b.k === 'stag' ? 'fight' : 'chase'; b.t = 0; b.cd = 0.5; b.noticed = true; b.ring = Math.atan2(b.pos.x - C.pos().x, b.pos.z - C.pos().z); b.dir = b.side; }
    else if (b.k === 'stag' && b.state === 'flee') { b.state = 'fight'; b.t = 0; }
    if (b.state !== 'charge' && !(b.k === 'bull' && b.state === 'paw' && !info.charged)) { b.stun = b.k === 'bull' ? 0.2 : 0.4; b.state = 'stun'; b.t = 0; play(b, 'Idle_HitReact1', { once: true, restart: true, fade: 0.05 }); }
    return true;
  }
  function die(b, info) {
    b.alive = false; b.stub.dead = true; b.e.alive = false; b.mats.forEach(m => m.emissive && m.emissive.setRGB(0.02, 0.02, 0.02));
    play(b, 'Death', { once: true, restart: true, fade: 0.08 }); b.lootAt = performance.now() / 1000 + 0.9;
    C.event && C.event('kill', b.stub); C.shake && C.shake(0.3); C.toast && C.toast(`${b.T.ico} ${b.T.n}倒下了——按 E 搜刮尸骸`, '#ffd0a0', 2.2);
  }
  // 掉落表 → Sack 物品（由 Sack.carcass 调用）
  function dropsOf(b) { const r = mulberry(b.e.seed >>> 0), out = []; for (const [id, a, c, p] of b.T.drops) if (r() < p) out.push([id, a + Math.floor(r() * (c - a + 1))]); if (!out.length) out.push(['meat', 1]); return out; }
  return { spawn, clear, update, targets, plan, dropsOf, TYPES, get list() { return BS; }, get count() { return BS.filter(b => b.alive).length; } };
})();
