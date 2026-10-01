// R54k MOD moon_trail（默认开）：月之线索改为跑图任务「月之踪迹」——出猎时有几率（斩下月使后的下一趟、或用了寻月罗盘则必定）
// 在本地区随机 3 个地点留下月痕；门牌上的 🌙 指出去下一处月痕该走哪扇门，限时内依次找齐 = 1 条月之线索。章节 BOSS 不再给线索。
window.MoonTrail = (() => {
  const on = () => (!window.Mods || Mods.on('moon_trail') !== false) && !!window.Saga;
  const G = () => window.G, W = () => (window.Worlds && Worlds.active ? Worlds._W : null), V3 = THREE.Vector3;
  const toast = (t, c, s) => { try { G().toast(t, c, s); } catch (e) { } };
  const SS = () => { const S = G().S; S.mtrail = S.mtrail || { promise: 0, done: 0, fail: 0 }; return S.mtrail; };
  const LIMIT = 420;
  let T = null, wasW = null, el = null;
  const need = () => { try { return Saga.clues() < Saga.NEED; } catch (e) { return false; } };
  function promise() { if (!on()) return; SS().promise = 1; }
  function begin(w) {
    T = null; if (!on() || !w || !w.graph || !w.graph.trip || w.graph.arena || !need()) return;
    const s = SS(), p = s.promise ? 1 : 0.35; if (Math.random() > p) return; s.promise = 0;
    const cand = w.graph.nodes.filter(n => !n.home && !n.boss).sort(() => Math.random() - 0.5); if (cand.length < 2) return;
    const k = Math.min(3, cand.length); T = { list: cand.slice(0, k).sort((a, b) => a.depth - b.depth).map(n => n.i), got: 0, t: LIMIT, sp: null };
    setTimeout(() => { toast(`🌙 <b>月之踪迹</b>：月光在这片地区留下了 ${k} 处月痕。限时 ${Math.round(LIMIT / 60)} 分钟依次找齐，得到 1 条月之线索。门牌上的 🌙 = 往下一处月痕的路。`, '#d8d0ff', 6); try { Worlds.relabel(); } catch (e) { } }, 2500);
  }
  const target = () => (T && T.got < T.list.length ? T.list[T.got] : -1);
  function hop(w) { // 当前地点 → 目标的最短路第一步
    const tg = target(); if (tg < 0 || !w) return -1; if (w.cur === tg) return tg; const N = w.graph.nodes, prev = { [w.cur]: -1 }, q = [w.cur];
    while (q.length) { const a = q.shift(); if (a === tg) break; for (const b of N[a].adj) if (prev[b] === undefined) { prev[b] = a; q.push(b); } }
    if (prev[tg] === undefined) return -1; let c = tg; while (prev[c] !== w.cur && prev[c] !== -1) c = prev[c]; return c;
  }
  const mark = m => { const w = W(); return !!(T && w && m && m.i === hop(w) && m.i !== w.cur); };
  function spawn(w) {
    const B = w.B, a = Math.random() * 6.28, d = (B.R || 15) * (0.35 + Math.random() * 0.3), x = Math.cos(a) * d, z = Math.sin(a) * d, y = B.H ? B.H(x, z) : 0, g = new THREE.Group(); g.position.set(x, y, z);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#d8e4ff').multiplyScalar(1.6) }), cr = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 8, 28, Math.PI * 1.25), mat); cr.position.y = 1.2; cr.rotation.z = 0.6; g.add(cr);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.5, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#b8c8ff', transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); beam.position.y = 7; g.add(beam);
    const pl = new THREE.PointLight('#c8d4ff', 1.6, 7, 2); pl.position.y = 1.3; g.add(pl);
    g.traverse(o => { o.raycast = () => { }; }); B.sc.add(g); T.sp = { B, g, cr, i: w.cur };
    toast('🌙 这里有一处月痕——找到那道从天上落下来的光柱', '#d8d0ff', 3);
  }
  function collect(w) {
    const sp = T.sp; try { sp.B.sc.remove(sp.g); } catch (e) { } T.sp = null; T.got++;
    try { SFX.soul && SFX.soul(8, 3); G().flash && G().flash('#c8d4ff', 0.4, 400); } catch (e) { }
    if (T.got >= T.list.length) { T = null; SS().done++; try { const d = Saga.giveClue('trail'); if (d && Saga.banner) Saga.banner('🌙 月之线索 +1', d.t.replace(/^“|”$/g, ''), `月之线索 ${Saga.clues()}/${Saga.NEED}${Saga.clues() >= Saga.NEED ? ' · 月之魔女的神殿向你敞开了' : ''}`, '#c8b8ff', 7000); } catch (e) { } }
    else toast(`🌙 月痕 ${T.got}/${T.list.length} —— 下一处在「${w.graph.nodes[target()].name}」（跟着门牌上的 🌙 走）`, '#d8d0ff', 4);
    try { Worlds.relabel(); } catch (e) { }
  }
  function ui(w) {
    if (!el) { el = document.createElement('div'); el.id = 'mtTrack'; el.style.cssText = 'position:fixed;left:14px;top:46%;z-index:31;pointer-events:none;padding:7px 12px;font:600 13px "Microsoft YaHei UI",sans-serif;color:#e0dcff;background:linear-gradient(90deg,#141030d8,transparent);border-left:3px solid #b8a8ff;display:none'; document.body.appendChild(el); }
    if (!T || !w) { el.style.display = 'none'; return; } const tg = target(), m = Math.floor(T.t / 60), s = Math.floor(T.t % 60);
    el.style.display = 'block'; el.innerHTML = `🌙 月之踪迹 ${T.got}/${T.list.length} · ${String(m)}:${String(s).padStart(2, '0')}<br><small style="font-weight:400;color:#b8b0e0">下一处：「${w.graph.nodes[tg].name}」${w.cur === tg ? '（就在这里——找光柱）' : ' · 门牌 🌙'}</small>`;
  }
  let last = performance.now();
  function tick() {
    const now = performance.now(), dt = Math.min(1, (now - last) / 1000); last = now; if (!on() || !G() || !G().S) return; const w = W();
    if (w !== wasW) { if (w && !wasW) begin(w); if (!w) { if (T) SS().fail++; T = null; } wasW = w; }
    if (w && T) {
      if (!w.busy && !w.dead) T.t -= dt;
      if (T.t <= 0) { T = null; toast('🌙 月光移开了——月痕消散了。下次再碰运气。', '#a8a0c8', 3.5); try { Worlds.relabel(); } catch (e) { } }
      else if (w.B && !w.B.corr && !w.busy) {
        if (T.sp && T.sp.B !== w.B) T.sp = null;
        if (!T.sp && w.cur === target()) spawn(w);
        if (T.sp) { T.sp.cr.rotation.y += dt * 1.5; const p = T.sp.g.position; if (Math.hypot(w.pos.x - p.x, w.pos.z - p.z) < 1.8) collect(w); }
      }
    }
    ui(w);
  }
  setInterval(() => { try { tick(); } catch (e) { } }, 100);
  return { on, promise, mark, get T() { return T; }, SS, _begin: begin };
})();
