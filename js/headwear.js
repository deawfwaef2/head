// 头饰：程序化精细建模，贴合每个发型的外轮廓（onShell）。look.hw = [{ k, c, c2, v }]
window.HeadWear = (() => {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const PAL = {
    ribbon: ['#d81b3a', '#ff7aa8', '#1a1a22', '#ffffff', '#b89aff', '#2a3a8a', '#7ae0c0', '#ffb020'],
    hat: ['#7a1a2a', '#1f2a4a', '#1a1a1e', '#e8dcc0', '#2e4a2a', '#4a2a5a'],
    metal: ['#e0b040', '#d0d4e0', '#e8a0b0', '#20202a'],
    flower: ['#ffffff', '#ffd0e0', '#ffe27a', '#c8a8ff', '#ff8aa8', '#a8d8ff', '#ff6a5a'],
    feather: [['#ffffff', '#a8c8ff'], ['#2a6a5a', '#9affd0'], ['#a01a1a', '#ffb060'], ['#1a1a1e', '#8a5aff'], ['#e8d8b0', '#6a4020']]
  };
  const N = { ribbon: '大蝴蝶结', maid: '女仆头饰', bunny: '兔耳发箍', beret: '贝雷帽', minihat: '迷你礼帽', hairpins: '交叉发夹', star: '星星发夹', flowercrown: '花冠', goggles: '护目镜', kanzashi: '流苏发簪', bells: '铃铛发绳', feather: '羽饰', thorncrown: '暗棘之冠', twinbows: '双侧蝴蝶结' };
  const GROUP = { beret: 'hat', minihat: 'hat', maid: 'band', bunny: 'band', goggles: 'band', flowercrown: 'band', thorncrown: 'band', ribbon: 'side', hairpins: 'side', star: 'side', kanzashi: 'side', bells: 'side', feather: 'side', twinbows: 'side' };
  const BY_ID = {
    villager: { ribbon: 0.4, flowercrown: 0.25, hairpins: 0.2 }, shepherd: { flowercrown: 0.4, ribbon: 0.3, beret: 0.2 }, barmaid: { maid: 0.75, ribbon: 0.3 },
    smithgirl: { goggles: 0.7, hairpins: 0.3 }, herbalist: { flowercrown: 0.6, hairpins: 0.25 }, huntress: { feather: 0.6 }, bard: { beret: 0.7, feather: 0.5 },
    novice: { ribbon: 0.3, hairpins: 0.3 }, ranger: { feather: 0.5 }, druid: { flowercrown: 0.6, feather: 0.3 }, singer: { flowercrown: 0.4, ribbon: 0.4 },
    archer: { feather: 0.5, hairpins: 0.2 }, moonpriest: { kanzashi: 0.4, hairpins: 0.4 }, elfprincess: { flowercrown: 0.5, twinbows: 0.2 },
    wolfwarrior: { feather: 0.4, bells: 0.2 }, foxmiko: { kanzashi: 0.65, bells: 0.7 }, catthief: { ribbon: 0.4, bells: 0.4 }, shaman: { feather: 0.8 },
    chieftess: { feather: 0.7, thorncrown: 0.2 }, falconer: { feather: 0.9 }, nun: { hairpins: 0.3 }, paladin: { ribbon: 0.3 }, choir: { ribbon: 0.4, flowercrown: 0.3 },
    inquisitor: { minihat: 0.3, hairpins: 0.3 }, saint: { flowercrown: 0.6 }, abbess: { hairpins: 0.3 }, witch: { star: 0.5, ribbon: 0.3 }, alchemist: { goggles: 0.8, star: 0.2 },
    hexer: { thorncrown: 0.5, minihat: 0.3 }, bogwitch: { flowercrown: 0.4, feather: 0.4 }, covenlady: { thorncrown: 0.5, minihat: 0.4 }, countess: { minihat: 0.8, ribbon: 0.3 },
    knight: { ribbon: 0.35 }, merc: { feather: 0.4, goggles: 0.2 }, crossbow: { goggles: 0.4, hairpins: 0.3 }, medic: { hairpins: 0.4, ribbon: 0.4 }, engineer: { goggles: 0.9 },
    general: { feather: 0.6 }, dragonknight: { hairpins: 0.4, feather: 0.3 }, princess: { ribbon: 0.5, flowercrown: 0.4, twinbows: 0.2 }, lady: { minihat: 0.5, ribbon: 0.6 },
    courtmage: { beret: 0.4, kanzashi: 0.3 }, assassin: { hairpins: 0.5 }, guard: { ribbon: 0.3 }, musician: { beret: 0.6, ribbon: 0.4 }, queen: { kanzashi: 0.2 },
    succubus: { bunny: 0.3, ribbon: 0.4, thorncrown: 0.2 }, fallen: { thorncrown: 0.7 }, duchess: { minihat: 0.5, thorncrown: 0.4 }, shadow: { hairpins: 0.5 },
    abyssqueen: { thorncrown: 0.8 }, dragonprincess: { kanzashi: 0.5, hairpins: 0.3 }, avatar: { flowercrown: 0.6 }, archangel: { flowercrown: 0.5 },
    dragonslayer: { feather: 0.5 }, dragonmiko: { kanzashi: 0.6, bells: 0.6 }
  };
  const EXTRA = { ribbon: 0.14, hairpins: 0.1, star: 0.06, bunny: 0.05, twinbows: 0.06, flowercrown: 0.05, beret: 0.04 };

  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => (s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0) / 4294967296; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  function roll(seed, c, look) {
    const r = rng((seed || 1) * 31 + 7), out = [], used = new Set();
    const blocked = new Set();
    const acc = (look && look.acc) || [];
    if (acc.includes('witchhat') || acc.includes('crown')) { blocked.add('hat'); blocked.add('band'); }
    if (acc.includes('tiara') || acc.includes('circlet') || acc.includes('circletS')) blocked.add('band');
    if (look && look.feat === 'beast') blocked.add('bunny');
    const tryAdd = (k) => { const g = GROUP[k]; if (out.length >= 2 || used.has(g) || blocked.has(g) || blocked.has(k)) return; if ((g === 'hat' && used.has('band')) || (g === 'band' && used.has('hat'))) return; used.add(g); out.push(mk(k, r)); };
    if (acc.includes('flowers')) tryAdd('flowercrown');
    const T = BY_ID[c && c.id] || {};
    const tf = (window.Mods && Mods.on('tier_look') && c) ? [0.35, 0.7, 1, 1.25, 1.45][Math.max(0, Math.min(4, c.rar | 0))] : 1; // 第二十五轮 MOD tier_look：低魂阶少头饰、高魂阶多
    for (const k of Object.keys(T)) if (r() < T[k] * tf) tryAdd(k);
    for (const k of Object.keys(EXTRA)) if (r() < EXTRA[k] * tf * (out.length ? 0.4 : 1)) tryAdd(k);
    return out;
  }
  function mk(k, r) {
    const e = { k };
    if (k === 'ribbon' || k === 'twinbows') { e.c = pick(r, PAL.ribbon); e.v = pick(r, ['top', 'top', 'back', 'side']); e.s = +(0.85 + r() * 0.4).toFixed(2); }
    else if (k === 'maid') e.c = pick(r, ['#1a1a24', '#1a1a24', '#2a2a5a', '#5a1a2a']);
    else if (k === 'bunny') { e.c = pick(r, ['#ffffff', '#1a1a1e', '#ffd8e8', '#e8dcc0']); e.v = r() < 0.5 ? 1 : 0; }
    else if (k === 'beret' || k === 'minihat') { e.c = pick(r, PAL.hat); e.c2 = pick(r, PAL.ribbon); }
    else if (k === 'hairpins' || k === 'star') { e.c = pick(r, PAL.metal.concat(PAL.ribbon.slice(0, 3))); e.v = r() < 0.5 ? 1 : -1; }
    else if (k === 'flowercrown') { e.c = pick(r, PAL.flower); e.c2 = pick(r, PAL.flower); }
    else if (k === 'goggles') { e.c = pick(r, ['#2ab8b0', '#ffb040', '#8a5aff', '#40a0ff', '#ff4a6a']); }
    else if (k === 'kanzashi') { e.c = pick(r, ['#d81b3a', '#ff7aa8', '#b89aff', '#ffffff']); e.v = r() < 0.5 ? 1 : -1; }
    else if (k === 'bells') { e.c = pick(r, ['#d81b3a', '#d81b3a', '#ffffff', '#1a1a1e']); e.v = r() < 0.5 ? 1 : -1; }
    else if (k === 'feather') { const f = pick(r, PAL.feather); e.c = f[0]; e.c2 = f[1]; e.v = r() < 0.5 ? 1 : -1; }
    else if (k === 'thorncrown') e.c = pick(r, ['#b04aff', '#ff2a4a', '#4affd0']);
    return e;
  }
  const names = hw => (hw || []).map(e => N[e.k]).filter(Boolean);

  // ---------------- 建模 ----------------
  const GEO = {};
  const geo = (k, f) => GEO[k] || (GEO[k] = f());
  function build(ctx) {
    const { g, look, S, onShell, grad, disp } = ctx;
    const toon = (c, o = {}) => { const m = new (window.ModelHeads&&ModelHeads.MTM||THREE.MeshToonMaterial)(Object.assign({ color: c, gradientMap: grad }, o)); disp.push(m); return m; };
    const metal = (c, rough = 0.28) => { const m = new THREE.MeshStandardMaterial({ color: c, metalness: 0.85, roughness: rough }); disp.push(m); return m; };
    const surf = (x, y, z, out = 0.002) => { const d = V(x, y, z).normalize(); return { p: onShell(S, d.x, d.y, d.z, -out), n: d }; };
    const face = (o, p, n, upHint = V(0, 1, 0)) => { o.position.copy(p); const m = new THREE.Matrix4(); const z = n.clone().normalize(), x = new THREE.Vector3().crossVectors(upHint, z).normalize(); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); const y = new THREE.Vector3().crossVectors(z, x); m.makeBasis(x, y, z); o.quaternion.setFromRotationMatrix(m); };
    for (const e of look.hw || []) {
      try {
        if (e.k === 'ribbon') { const s = e.v === 'back' ? surf(0, 0.35, -1) : e.v === 'side' ? surf(0.95, 0.45, -0.05) : surf(0.5, 0.85, -0.15); const b = bow(toon, e.c, e.s || 1); face(b, s.p, s.n); if (e.v === 'top') b.rotateZ(-0.35); g.add(b); }
        if (e.k === 'twinbows') for (const sx of [-1, 1]) { const s = surf(sx * 0.9, 0.5, -0.35); const b = bow(toon, e.c, 0.62); face(b, s.p, s.n); b.rotateZ(sx * 0.25); g.add(b); }
        if (e.k === 'maid') maid(e);
        if (e.k === 'bunny') bunny(e);
        if (e.k === 'beret') beret(e);
        if (e.k === 'minihat') minihat(e);
        if (e.k === 'hairpins') { const s = surf(e.v * 0.78, 0.5, 0.38, 0.001); const grp = new THREE.Group(); const m = metal(e.c, 0.3); for (let i = 0; i < 2; i++) { const bar = new THREE.Mesh(geo('pin', () => new THREE.CapsuleGeometry(0.0021, 0.026, 4, 10)), m); bar.rotation.z = (i ? 0.55 : -0.55); bar.position.x = i ? 0.001 : -0.001; grp.add(bar); } const bar3 = new THREE.Mesh(geo('pin', () => new THREE.CapsuleGeometry(0.0021, 0.026, 4, 10)), m); bar3.position.set(0.012 * e.v, -0.011, 0); bar3.rotation.z = 0.2 * e.v; grp.add(bar3); face(grp, s.p, s.n); g.add(grp); }
        if (e.k === 'star') { const s = surf(e.v * 0.72, 0.62, 0.3, 0.001); const st = new THREE.Mesh(geo('star', starGeo), toon(e.c, { emissive: new THREE.Color(e.c).multiplyScalar(0.15) })); face(st, s.p, s.n); st.rotateZ(0.3 * e.v); g.add(st); const s2 = surf(e.v * 0.62, 0.72, 0.18, 0.001); const st2 = new THREE.Mesh(geo('star', starGeo), toon(e.c)); st2.scale.setScalar(0.6); face(st2, s2.p, s2.n); st2.rotateZ(-0.2); g.add(st2); }
        if (e.k === 'flowercrown') crown(e, false);
        if (e.k === 'thorncrown') crown(e, true);
        if (e.k === 'goggles') goggles(e);
        if (e.k === 'kanzashi') kanzashi(e);
        if (e.k === 'bells') bells(e);
        if (e.k === 'feather') feather(e);
      } catch (err) { console.warn('headwear', e.k, err); }
    }
    // --- 各件 ---
    function arcPts(n, spread, tiltZ, lift = 0.001) { const P = [], Nn = []; for (let i = 0; i <= n; i++) { const t = (i / n - 0.5) * 2 * spread; const d = V(Math.sin(t), Math.cos(t), tiltZ).normalize(); P.push(onShell(S, d.x, d.y, d.z, -lift)); Nn.push(d); } return { P, N: Nn }; }
    function maid(e) {
      const n = 72, A = arcPts(n, 1.32, 0.34, 0.0015);
      const band = strip(A, 0.0065, 0, 0.0025), frill = frillGeo(A);
      g.add(new THREE.Mesh(band, toon(e.c))); g.add(new THREE.Mesh(frill, toon('#fbfbff', { side: THREE.DoubleSide })));
      disp.push(band, frill);
      for (const k of [0.06, 0.94]) { const i = Math.round(k * n); const b = bow(toon, e.c, 0.32); face(b, A.P[i].clone().addScaledVector(A.N[i], 0.004), A.N[i]); g.add(b); }
    }
    function strip(A, w, off, lift) { // 沿弧线的带子
      const pos = [], idx = []; const n = A.P.length;
      for (let i = 0; i < n; i++) { const p = A.P[i], nn = A.N[i]; const t = (A.P[Math.min(n - 1, i + 1)].clone().sub(A.P[Math.max(0, i - 1)])).normalize(); const f = new THREE.Vector3().crossVectors(t, nn).normalize();
        const base = p.clone().addScaledVector(nn, lift); pos.push(...base.clone().addScaledVector(f, off - w).toArray(), ...base.clone().addScaledVector(f, off + w).toArray(), ...base.clone().addScaledVector(f, off + w).addScaledVector(nn, 0.0025).toArray(), ...base.clone().addScaledVector(f, off - w).addScaledVector(nn, 0.0025).toArray()); }
      for (let i = 0; i < n - 1; i++) { const a = i * 4, b = (i + 1) * 4; for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; idx.push(a + k, b + k, b + k2, a + k, b + k2, a + k2); } }
      const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); G.setIndex(idx); G.computeVertexNormals(); return G;
    }
    function frillGeo(A) { // 百褶蕾丝：沿带子立起、前后交替褶皱、顶部波浪花边
      const pos = [], idx = []; const n = A.P.length, sub = 3, M = (n - 1) * sub + 1;
      const at = (u) => { const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), k = f - i; return { p: A.P[i].clone().lerp(A.P[i + 1], k), nn: A.N[i].clone().lerp(A.N[i + 1], k).normalize(), t: A.P[i + 1].clone().sub(A.P[i]).normalize() }; };
      for (let j = 0; j < M; j++) { const u = j / (M - 1), { p, nn, t } = at(u); const f = new THREE.Vector3().crossVectors(t, nn).normalize();
        const pleat = Math.sin(j * Math.PI * 0.5) * 0.0028, h = 0.017 + Math.abs(Math.sin(j * Math.PI / 6)) * 0.004, fade = Math.min(1, Math.min(u, 1 - u) * 12);
        const b0 = p.clone().addScaledVector(nn, 0.0035).addScaledVector(f, 0.003), b1 = b0.clone().addScaledVector(nn, h * fade).addScaledVector(f, pleat + 0.004 * fade);
        pos.push(...b0.toArray(), ...b0.clone().lerp(b1, 0.5).addScaledVector(f, pleat * 0.6).toArray(), ...b1.toArray()); }
      for (let j = 0; j < M - 1; j++) { const a = j * 3, b = (j + 1) * 3; for (let k = 0; k < 2; k++) idx.push(a + k, b + k, b + k + 1, a + k, b + k + 1, a + k + 1); }
      const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); G.setIndex(idx); G.computeVertexNormals(); return G;
    }
    function bunny(e) {
      const A = arcPts(48, 1.28, 0.1, 0.002);
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(A.P), 64, 0.0034, 8, false); disp.push(tube);
      g.add(new THREE.Mesh(tube, toon(e.c === '#1a1a1e' ? '#1a1a1e' : '#f4f0f4')));
      const outer = toon(e.c), inner = toon('#ffb0c4');
      [-1, 1].forEach((sx, j) => { const i = Math.round((0.5 + sx * 0.16) * 48); const ear = new THREE.Group();
        const flop = e.v && j === 1;
        const o = new THREE.Mesh(earGeo(flop, 1), outer), ii = new THREE.Mesh(earGeo(flop, 0.62), inner); ii.position.z = 0.0045; ii.position.y = 0.004; ear.add(o, ii);
        face(ear, A.P[i].clone().addScaledVector(A.N[i], 0.002), V(sx * 0.18, 0.1, 1).normalize(), A.N[i]); ear.rotateX(-0.25); g.add(ear); });
    }
    function earGeo(flop, s) { return geo('ear' + (flop ? 'f' : '') + s, () => { const G = new THREE.SphereGeometry(0.5, 20, 18); G.translate(0, 0.5, 0); G.scale(0.02 * s, 0.078 * s, 0.0075 * s); const p = G.attributes.position;
      if (flop) for (let i = 0; i < p.count; i++) { const y = p.getY(i), piv = 0.04 * s; if (y > piv) { const a = (y - piv) / (0.078 * s - piv) * 1.5, r = y - piv, z = p.getZ(i); p.setY(i, piv + r * Math.cos(a) - z * Math.sin(a) * 0.3); p.setZ(i, z + r * Math.sin(a) * 0.9); } }
      G.computeVertexNormals(); return G; }); }
    function beret(e) {
      const s = surf(0.32, 0.94, -0.12, 0.0);
      const prof = [[0.0001, 0.02], [0.03, 0.021], [0.058, 0.017], [0.078, 0.009], [0.084, 0.002], [0.08, -0.004], [0.07, -0.006], [0.062, -0.004], [0.06, -0.001]].map(([x, y]) => new THREE.Vector2(x, y));
      const G = geo('beret', () => { const G = new THREE.LatheGeometry(prof, 40); G.computeVertexNormals(); return G; });
      const b = new THREE.Group(); b.add(new THREE.Mesh(G, toon(e.c, { side: THREE.DoubleSide })));
      const band = new THREE.Mesh(geo('beretB', () => new THREE.TorusGeometry(0.061, 0.0028, 8, 40)), toon(new THREE.Color(e.c).multiplyScalar(0.6))); band.rotation.x = Math.PI / 2; band.position.y = -0.003; b.add(band);
      const stem = new THREE.Mesh(geo('stem', () => new THREE.CylinderGeometry(0.0022, 0.0032, 0.008, 8)), toon(e.c)); stem.position.y = 0.024; b.add(stem);
      b.position.copy(s.p).addScaledVector(s.n, -0.004); b.quaternion.setFromUnitVectors(V(0, 1, 0), s.n.clone().add(V(0.25, 0, 0)).normalize()); g.add(b);
    }
    function minihat(e) {
      const s = surf(0.52, 0.84, 0.02, 0.0);
      const h = new THREE.Group(), m = toon(e.c), m2 = toon(e.c2 || '#d81b3a');
      const prof = [[0.0001, 0.058], [0.029, 0.058], [0.031, 0.056], [0.027, 0.012], [0.028, 0.004], [0.046, 0.004], [0.05, 0.007], [0.052, 0.004], [0.047, -0.001], [0.026, -0.001], [0.0001, -0.001]].map(([x, y]) => new THREE.Vector2(x, y));
      h.add(new THREE.Mesh(geo('minihat', () => new THREE.LatheGeometry(prof, 36)), m));
      const band = new THREE.Mesh(geo('mhB', () => new THREE.CylinderGeometry(0.0282, 0.0272, 0.011, 36, 1, true)), m2); band.position.y = 0.012; h.add(band);
      const rose = bow(toon, e.c2 || '#d81b3a', 0.3); rose.position.set(0.024, 0.014, 0.012); rose.rotation.y = 0.9; h.add(rose);
      const veil = new THREE.Mesh(geo('veil', () => { const G = new THREE.SphereGeometry(0.05, 20, 8, -0.2, 2.2, 1.3, 0.5); return G; }), new (window.ModelHeads&&ModelHeads.MTM||THREE.MeshToonMaterial)({ color: '#111', gradientMap: grad, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); disp.push(veil.material); veil.position.y = 0.03; veil.rotation.y = 0.6; h.add(veil);
      h.position.copy(s.p).addScaledVector(s.n, -0.003); h.quaternion.setFromUnitVectors(V(0, 1, 0), s.n.clone().add(V(0.35, 0, 0)).normalize()); g.add(h);
    }
    function crown(e, dark) {
      const n = dark ? 11 : 13, grp = new THREE.Group();
      const mA = dark ? metal('#1d1822', 0.35) : null, fm = [toon(e.c), toon(e.c2 || e.c), toon('#ffffff')], leaf = toon('#4a9a4a'), ctr = toon('#ffd24a');
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const d = V(Math.sin(a), 0.62 - Math.cos(a) * 0.08, Math.cos(a) + 0.12);
        const s = surf(d.x, d.y, d.z, 0.002);
        if (dark) { const sp = new THREE.Mesh(geo('thorn', thornGeo), mA); face(sp, s.p, s.n); sp.rotateX(0.3); sp.scale.setScalar(i % 2 ? 0.75 : 1.25); grp.add(sp);
          if (i === 0) { const gem = new THREE.Mesh(geo('dgem', () => new THREE.OctahedronGeometry(0.007)), new THREE.MeshStandardMaterial({ color: e.c, emissive: e.c, emissiveIntensity: 1.2, metalness: 0.3, roughness: 0.15 })); disp.push(gem.material); gem.position.copy(s.p).addScaledVector(s.n, 0.006); gem.scale.set(0.8, 1.3, 0.6); grp.add(gem); } }
        else { const f = new THREE.Mesh(geo('flw', flowerGeo), fm[i % 3]); face(f, s.p, s.n); f.rotateZ(i * 1.7); f.scale.setScalar(0.85 + (i % 3) * 0.15); grp.add(f); const c = new THREE.Mesh(geo('fctr', () => new THREE.SphereGeometry(0.0028, 10, 8)), ctr); c.position.copy(s.p).addScaledVector(s.n, 0.0035); grp.add(c);
          const a2 = a + Math.PI / n, d2 = V(Math.sin(a2), 0.6 - Math.cos(a2) * 0.08, Math.cos(a2) + 0.12), s2 = surf(d2.x, d2.y, d2.z, 0.001); const lf = new THREE.Mesh(geo('leaf', leafGeo), leaf); face(lf, s2.p, s2.n, V(Math.cos(a2), 0, -Math.sin(a2))); grp.add(lf); }
      }
      if (dark) { const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; const d = V(Math.sin(a), 0.62 - Math.cos(a) * 0.08, Math.cos(a) + 0.12); const s = surf(d.x, d.y, d.z, 0.0015); pts.push(s.p); } const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, 0.0022, 6, true); disp.push(tg); grp.add(new THREE.Mesh(tg, mA)); }
      g.add(grp);
    }
    function goggles(e) {
      const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; const d = V(Math.sin(a), 0.5 + Math.cos(a) * 0.12, Math.cos(a)); pts.push(surf(d.x, d.y, d.z, 0.0015).p); }
      const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, 0.0045, 6, true); disp.push(tg); tg.scale(1, 1, 1);
      const strap = new THREE.Mesh(tg, toon('#4a3222')); strap.scale.set(1, 0.9, 1); g.add(strap);
      const brass = metal('#c8903a', 0.3), cup = toon('#3a2a1e'), lens = new THREE.MeshStandardMaterial({ color: e.c, metalness: 0.6, roughness: 0.08, emissive: e.c, emissiveIntensity: 0.25 }); disp.push(lens);
      for (const sx of [-1, 1]) { const s = surf(sx * 0.3, 0.74, 0.62, 0.004); const gg = new THREE.Group();
        const c = new THREE.Mesh(geo('gcup', () => new THREE.CylinderGeometry(0.0135, 0.015, 0.01, 24)), cup); c.rotation.x = Math.PI / 2; gg.add(c);
        const r = new THREE.Mesh(geo('grim', () => new THREE.TorusGeometry(0.0132, 0.0028, 8, 28)), brass); r.position.z = 0.005; gg.add(r);
        const l = new THREE.Mesh(geo('glens', () => new THREE.SphereGeometry(0.0125, 20, 10, 0, Math.PI * 2, 0, 0.9)), lens); l.rotation.x = Math.PI / 2; l.position.z = -0.002; l.scale.set(1, 0.45, 1); gg.add(l);
        face(gg, s.p, s.n); g.add(gg); }
    }
    function kanzashi(e) {
      const s = surf(e.v * 0.55, 0.55, -0.62, 0.0);
      const k = new THREE.Group(), gold = metal('#e0b040', 0.25), petal = toon(e.c), white = toon('#fff4f0');
      const stick = new THREE.Mesh(geo('kstick', () => new THREE.CylinderGeometry(0.0018, 0.0012, 0.1, 8)), toon('#2a1a14')); stick.rotation.z = Math.PI / 2 - 0.5 * e.v; k.add(stick);
      const ornament = new THREE.Group(); ornament.position.set(-0.04 * e.v, 0.018, 0.004); k.add(ornament);
      [[0, 0, 1.25, petal], [0.013, -0.008, 0.9, white], [-0.012, -0.007, 0.85, petal]].forEach(([x, y, sc, m]) => { const f = new THREE.Mesh(geo('flw', flowerGeo), m); f.position.set(x, y, 0.004); f.scale.setScalar(sc * 1.3); ornament.add(f); const c = new THREE.Mesh(geo('fctr', () => new THREE.SphereGeometry(0.0028, 10, 8)), gold); c.position.set(x, y, 0.008); ornament.add(c); });
      for (let j = 0; j < 3; j++) { for (let b = 0; b < 6; b++) { const bead = new THREE.Mesh(geo('bead', () => new THREE.SphereGeometry(0.0019, 8, 6)), b === 5 ? petal : gold); bead.position.set((j - 1) * 0.008, -0.012 - b * 0.0055 - j % 2 * 0.004, 0.002); ornament.add(bead); } }
      face(k, s.p, s.n); g.add(k);
    }
    function bells(e) {
      const s = surf(e.v * 0.9, 0.05, -0.3, 0.001); const b = new THREE.Group(), cord = toon(e.c), gold = metal('#f0c040', 0.22), dark = toon('#3a2a10');
      const knot = new THREE.Mesh(geo('knot', () => new THREE.TorusKnotGeometry(0.0055, 0.0018, 40, 6, 2, 3)), cord); b.add(knot);
      for (const [x, len] of [[-0.004, 0.018], [0.005, 0.026]]) { const c = new THREE.Mesh(geo('cord' + len, () => new THREE.CylinderGeometry(0.0009, 0.0009, len, 5)), cord); c.position.set(x, -len / 2, 0.002); b.add(c);
        const bell = new THREE.Mesh(geo('bell', () => new THREE.SphereGeometry(0.0058, 16, 12)), gold); bell.position.set(x, -len - 0.005, 0.002); b.add(bell);
        const slit = new THREE.Mesh(geo('slit', () => new THREE.TorusGeometry(0.0058, 0.0007, 4, 20)), dark); slit.position.copy(bell.position); slit.rotation.x = Math.PI / 2; b.add(slit); }
      b.position.copy(s.p); b.quaternion.setFromUnitVectors(V(0, 0, 1), s.n); b.rotation.z = 0; b.rotation.x = 0; b.lookAt(s.p.clone().add(s.n)); g.add(b);
    }
    function feather(e) {
      const s = surf(e.v * 0.8, 0.5, -0.4, 0.0);
      const G = geo('feather' + e.c + e.c2, () => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(0.012, 0.02, 0.013, 0.07, 0.002, 0.105); sh.bezierCurveTo(-0.004, 0.08, -0.01, 0.03, 0, 0);
        const G = new THREE.ExtrudeGeometry(sh, { depth: 0.0006, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0005, bevelSegments: 2, curveSegments: 24 });
        const p = G.attributes.position, col = [], c0 = new THREE.Color(e.c), c1 = new THREE.Color(e.c2), t = new THREE.Color();
        for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) - y * y * 3); t.copy(c0).lerp(c1, Math.pow(Math.max(0, y / 0.105), 1.6)); col.push(t.r, t.g, t.b); }
        G.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); G.computeVertexNormals(); return G; });
      const f = new THREE.Mesh(G, toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide }));
      const shaft = new THREE.Mesh(geo('fshaft', () => { const c = new THREE.CatmullRomCurve3([V(0, -0.006, 0), V(0.001, 0.05, -0.006), V(0.002, 0.1, -0.03)]); return new THREE.TubeGeometry(c, 20, 0.0008, 5, false); }), toon('#f4efe4'));
      const grp = new THREE.Group(); grp.add(f, shaft); face(grp, s.p, s.n); grp.rotateX(0.35); grp.rotateZ(0.35 * e.v); g.add(grp);
    }
  }
  function bow(toon, col, sc) {
    const b = new THREE.Group(), m = toon(col), m2 = toon(new THREE.Color(col).multiplyScalar(0.62));
    const L = geo('bowL', () => { const s = new THREE.Shape(); s.moveTo(0, 0.002); s.bezierCurveTo(0.012, 0.022, 0.04, 0.031, 0.046, 0.011); s.bezierCurveTo(0.05, -0.006, 0.04, -0.025, 0.02, -0.021); s.bezierCurveTo(0.01, -0.018, 0.004, -0.006, 0, -0.002); s.closePath();
      const G = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.0035, bevelSegments: 4, curveSegments: 22 }); G.translate(0, 0, -0.002);
      const p = G.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, p.getZ(i) + Math.sin(Math.PI * Math.min(1, x / 0.046)) * 0.011 - x * 0.08); } G.computeVertexNormals(); return G; });
    const IN = geo('bowIn', () => { const s = new THREE.Shape(); s.moveTo(0, 0.0015); s.bezierCurveTo(0.008, 0.012, 0.024, 0.016, 0.028, 0.006); s.bezierCurveTo(0.03, -0.004, 0.022, -0.012, 0.01, -0.01); s.lineTo(0, -0.0015); s.closePath(); const G = new THREE.ShapeGeometry(s, 16); return G; });
    const T = geo('bowT', () => { const s = new THREE.Shape(); s.moveTo(-0.005, 0); s.lineTo(0.005, 0); s.quadraticCurveTo(0.012, -0.024, 0.018, -0.05); s.lineTo(0.012, -0.044); s.lineTo(0.008, -0.053); s.quadraticCurveTo(0.002, -0.026, -0.005, 0);
      const G = new THREE.ExtrudeGeometry(s, { depth: 0.0015, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.0008, bevelSegments: 2, curveSegments: 12 }); const p = G.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) - y * y * 6); } G.computeVertexNormals(); return G; });
    for (const sx of [-1, 1]) { const l = new THREE.Mesh(L, m); l.scale.x = sx; b.add(l); const inn = new THREE.Mesh(IN, m2); inn.scale.x = sx; inn.position.z = 0.012; b.add(inn); const t = new THREE.Mesh(T, m); t.scale.x = sx; t.position.set(sx * 0.002, -0.004, -0.004); t.rotation.z = sx * 0.1; b.add(t); }
    const k = new THREE.Mesh(geo('bowK', () => { const G = new THREE.SphereGeometry(0.0105, 16, 12); G.scale(1, 1.15, 0.85); return G; }), m); k.position.z = 0.003; b.add(k);
    b.scale.setScalar(sc); return b;
  }
  function flowerGeo() { const s = new THREE.Shape(); const n = 90; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; const r = 0.0088 * (0.5 + 0.5 * Math.pow(Math.abs(Math.cos(a * 2.5)), 0.55)); const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
    const G = new THREE.ExtrudeGeometry(s, { depth: 0.001, bevelEnabled: true, bevelThickness: 0.0014, bevelSize: 0.0009, bevelSegments: 3, curveSegments: 4 }); const p = G.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, p.getZ(i) + (x * x + y * y) * 22); } G.computeVertexNormals(); return G; }
  function leafGeo() { const s = new THREE.Shape(); s.moveTo(0, -0.011); s.quadraticCurveTo(0.006, 0, 0, 0.011); s.quadraticCurveTo(-0.006, 0, 0, -0.011); const G = new THREE.ExtrudeGeometry(s, { depth: 0.0006, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0005, bevelSegments: 2, curveSegments: 10 }); return G; }
  function starGeo() { const s = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.0052 : 0.0115; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) s.lineTo(x, y); else s.moveTo(x, y); } return new THREE.ExtrudeGeometry(s, { depth: 0.0015, bevelEnabled: true, bevelThickness: 0.0018, bevelSize: 0.0014, bevelSegments: 3 }); }
  function thornGeo() { const G = new THREE.ConeGeometry(0.0038, 0.03, 7, 6); G.translate(0, 0.015, 0); const p = G.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) + y * y * 9); } G.computeVertexNormals(); return G; }
  const item = (k, seed) => { let s = (seed || Math.floor(Math.random() * 1e9)) >>> 0; const r = () => { s = (s + 0x6D2B79F5) | 0; let q = Math.imul(s ^ s >>> 15, 1 | s); q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q; return ((q ^ q >>> 14) >>> 0) / 4294967296; }; return mk(k, r); };
  return { roll, build, names, N, GROUP, item };
})();
