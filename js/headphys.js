// 第二十六轮(l) · MOD head_support（默认开）：所有放头建筑的首级必须有东西托着，不能悬空（用户：“所有建筑的头都必须遵守物理学”）。
// 做法：每种放头建筑第一次 make() 时，从每个槽位的颈部切口上方往下打一圈射线（半径 ≤6.5cm，只打这座建筑自己的网格），
//       找到首级下方最高的实体表面，把槽位高度（mount.slots[i][1] / mount.top）改到正好落在上面——
//       因为直接改的是槽位数据，游戏的 seatHead、各模块自己的 reseat、手放吸附都会一起生效。
//   · 首级下方是液体（透明材质）：沉下去 8cm，像泡在里面；
//   · 首级被土/花泥埋住（表面在颈部上方）：保持原样（埋着也算有支撑）；
//   · 下方 0.7m 内完全打不到东西（比如用细绳吊着的缩首）：不动，交给该建筑自己处理。
// 另给建筑作者一个工具 HeadPhys.top(group, x, z, r)：在 (x,z) 半径 r 内找模型最高点，用来把首级放到斧柄顶、石头顶上。
window.HeadPhys = (() => {
  const on = () => !(window.Mods && Mods.on && !Mods.on('head_support'));
  const V3 = THREE.Vector3, rc = new THREE.Raycaster(), DOWN = new V3(0, -1, 0), _o = new V3();
  const RING = (() => { const p = [[0, 0]]; for (const r of [0.035, 0.065]) for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; })();
  function solids(g) { // 只收实体网格：不要粒子 / 线 / 精灵 / 火焰 / 几乎全透明的东西
    const out = []; g.updateMatrixWorld(true);
    g.traverse(o => {
      if (!o.isMesh || o.isSprite || o.visible === false) return;
      for (let p = o; p; p = p.parent) if (p.userData && (p.userData.flame || p.userData.noSupport)) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material; if (m && m.transparent && m.opacity < 0.2) return;
      out.push(o);
    });
    return out;
  }
  const isLiquid = o => { const m = Array.isArray(o.material) ? o.material[0] : o.material; return !!(m && m.transparent && m.opacity < 0.95); };
  // (x, y0, z) 处颈部的支撑：返回 { y, liquid } 或 null（下方 0.7m 内没东西）
  function dbl(meshes, f) { // 双面探测：有些模型的土面/桶内法线朝下，单面射线会穿过去掉到底
    const saved = []; for (const o of meshes) for (const m of [].concat(o.material || [])) if (m && m.side !== THREE.DoubleSide) { saved.push([m, m.side]); m.side = THREE.DoubleSide; }
    try { return f(); } finally { for (const [m, sd] of saved) m.side = sd; }
  }
  function support(meshes, x, y0, z, pts) { return dbl(meshes, () => support1(meshes, x, y0, z, pts)); }
  function support1(meshes, x, y0, z, pts) {
    let best = -Infinity, liq = false;
    for (const [dx, dz] of (pts || RING)) {
      rc.set(_o.set(x + dx, y0 + 0.12, z + dz), DOWN); rc.far = 0.82;
      const h = rc.intersectObjects(meshes, false)[0]; if (h && h.point.y > best) { best = h.point.y; liq = isLiquid(h.object); }
    }
    return best > -Infinity ? { y: best, liquid: liq } : null;
  }
  // 在 (x,z) 半径 r 内找最高点（建筑作者用）：返回 {x,y,z}
  function top(g, x, z, r, y0) { const ms = solids(g); return dbl(ms, () => top1(ms, x, z, r, y0)); }
  function top1(ms, x, z, r, y0) {
    let best = null; const n = 7;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const px = x + (i / (n - 1) - 0.5) * 2 * r, pz = z + (j / (n - 1) - 0.5) * 2 * r; if (Math.hypot(px - x, pz - z) > r) continue;
      rc.set(_o.set(px, (y0 != null ? y0 : 5), pz), DOWN); rc.far = 10; const h = rc.intersectObjects(ms, false)[0];
      if (h && (!best || h.point.y > best.y + 0.002)) best = { x: px, y: h.point.y, z: pz };
    }
    return best;
  }
  const report = {};
  function fix(k, d, g) {
    const ms = solids(g); if (!ms.length) return; const mt = d.mount;
    if (!mt.slots) mt.slots = [[0, mt.y, 0]];
    const r = report[k] = [];
    mt.slots.forEach((s, i) => {
      const y0 = mt.top != null ? mt.top - 0.003 : s[1] - 0.02; if (y0 <= 0.01) { r.push('ground'); return; } // 地上的（京观之类）
      const sp = support(ms, s[0], y0, s[2]); if (!sp) { r.push('none'); return; }
      let y = sp.y; if (sp.liquid) y -= 0.08;
      const gap = y0 - y;
      if (gap > 0.012 && gap <= 0.12) { s[1] = y + 0.02; r.push('drop ' + gap.toFixed(3)); }
      else if (gap > 0.12 && gap < 0.7) { (d.__plinth = d.__plinth || []).push([s[0], y, s[2], gap]); r.push('plinth ' + gap.toFixed(3)); } // 落差大：原高度不变，下面垫一个木箱台座
      else r.push(gap <= 0 ? 'buried' : 'ok');
    });
    if (mt.top != null && mt.slots.some((s, i) => r[i] && r[i].startsWith('drop'))) mt.top = null; // 统一台面高度改为逐槽位
  }
  function plinth(g, x, y, z, h) { // 首级下方的木箱台座（CC0 wooden_crate_01，按落差拉高）
    const A = window.Assets; if (!A || !A.has || !A.has('wooden_crate_01')) return;
    const m = A.fit('wooden_crate_01', { w: 0.17, d: 0.17, h: h + 0.004, x, y: y - 0.002, z }); if (m) { m.userData.hpPlinth = 1; g.add(m); }
  }
  function wrapAll() {
    const C = window.BuildCat && BuildCat.C; if (!C || !on()) return;
    for (const k in C) {
      const d = C[k]; if (!d.mount || d.mount.selfSeat || d.__hp || typeof d.make !== 'function') continue; d.__hp = 1;
      const mk = d.make;
      d.make = function () {
        const g = mk.apply(this, arguments);
        if (!d.__hpDone && g && (!window.Assets || !Assets.has || Object.keys(Assets.models || {}).length)) { d.__hpDone = 1; try { fix(k, d, g); } catch (e) { console.warn('HeadPhys', k, e); } }
        if (g && d.__plinth) for (const [x, y, z, h] of d.__plinth) plinth(g, x, y, z, h);
        return g;
      };
    }
  }
  wrapAll(); setTimeout(wrapAll, 0); // 之后加载的模块（后续轮次）也包上
  return { support, top, solids, fix, wrapAll, report, on };
})();
