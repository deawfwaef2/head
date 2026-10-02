// 敌人 AI 台架：在真实游戏页里（Worlds 已 start、节点已进入）手动步进 Foe.update，统计行为。
// 用法（Playwright evaluate）：eval(await (await fetch('/tools/test/aibench.js')).text()); await __benchAll(40)
//   __bench(role, secs, {extra:n, extraRole, kite:true, circle:true, d0})  → 每个敌人一行
// 指标：atks 起手次数；hits 命中玩家次数；nearT 3m 内时间；avgD 平均距离；maxStuck 最长"站着不干事"秒数；maxAtkSec 单次攻击最长秒数（>5 = 攻击卡死）
(() => {
  const G = window.__game, W = Worlds._W, C = Foe.ctx(), loc = Lore.LOCS.find(l => l.k === 'village');
  let nowT = performance.now(); const H = new Map();
  if (!C.__hw) { const o = C.hitPlayer; C.hitPlayer = function (fo) { H.set(fo, (H.get(fo) || 0) + 1); return o.apply(this, arguments); }; C.__hw = 1; }
  W.busy = true; // 只让台架推进敌人，不让 Worlds.frame 同时更新
  window.__bench = async (role, secs, opt) => {
    opt = opt || {}; while (Foe.foes.length) Foe.foes.pop(); H.clear();
    const mk = async (r, seed, x, z) => { window.__forceRole = r; const h = RPG.foe(G.S, loc, seed, new Set(), new Set()); const out = await Foe.populate(C, [{ h, pos: new THREE.Vector3(x, 0, z) }], { keep: true }); window.__forceRole = null; const fo = out[0]; fo.brave = true; fo.seen = true; fo.state = 'chase'; fo.cd = 1; return fo; };
    W.pos.set(0, 0, 0); G.player.yaw = 0;
    const fos = [await mk(role, opt.seed || 123, 0, -(opt.d0 || 8))];
    for (let i = 0; i < (opt.extra || 0); i++) fos.push(await mk(opt.extraRole || role, 200 + i, (i % 2 ? 5 : -5), -(opt.d0 || 8) - 2));
    const M = fos.map(fo => ({ fo, atks: 0, was: false, stuck: 0, maxStuck: 0, last: fo.pos.clone(), near: 0, mind: 99, sum: 0, atkT: 0, maxAtkT: 0 })), dt = 1 / 30; let t = 0;
    for (let i = 0; i < secs * 30; i++) {
      nowT += 33; t += dt; G.S.hp = 99999;
      if (opt.circle) { const a = t * 0.5; W.pos.x = Math.sin(a) * 2; W.pos.z = Math.cos(a) * 2 - 2; G.player.yaw = -a; }
      if (opt.kite) { const fo = fos[0], dx = fo.pos.x - W.pos.x, dz = fo.pos.z - W.pos.z, d = Math.hypot(dx, dz) || 1; if (d < 3.5) { W.pos.x -= dx / d * 2.6 * dt; W.pos.z -= dz / d * 2.6 * dt; } }
      Foe.update(dt, nowT / 1000);
      for (const m of M) { const fo = m.fo, d = Math.hypot(fo.pos.x - W.pos.x, fo.pos.z - W.pos.z), sp = Math.hypot(fo.pos.x - m.last.x, fo.pos.z - m.last.z) / dt; m.last.copy(fo.pos);
        const atk = !!fo.atk; if (atk && !m.was) m.atks++; m.was = atk; if (atk) { m.atkT += dt; m.maxAtkT = Math.max(m.maxAtkT, m.atkT); } else m.atkT = 0;
        m.mind = Math.min(m.mind, d); m.sum += d; if (d < 3) m.near += dt;
        const idle = sp < 0.15 && !atk && !(fo.stag > 0) && !fo.sk && !(fo.gestT > 0) && fo.state === 'chase' && d > 2.4 && !(fo.block > 0);
        if (idle) { m.stuck += dt; m.maxStuck = Math.max(m.maxStuck, m.stuck); } else m.stuck = 0; }
    }
    return M.map(m => ({ role: m.fo.role, atks: m.atks, hits: H.get(m.fo) || 0, nearT: +m.near.toFixed(1), minD: +m.mind.toFixed(1), avgD: +(m.sum / (secs * 30)).toFixed(1), maxStuck: +m.maxStuck.toFixed(1), maxAtkSec: +m.maxAtkT.toFixed(1), st: m.fo.state }));
  };
  window.__benchAll = async (secs, opt) => {
    const roles = ['duelist', 'juggernaut', 'mage', 'healer', 'warcaller', 'lancer', 'twinblade', 'bomber', 'netter', 'trapper', 'wispcaller'], res = [];
    for (const r of roles) { try { res.push((await __bench(r, secs, opt)).map(x => JSON.stringify(x)).join(' | ')); } catch (e) { res.push(r + ' ERR ' + e); } }
    return res;
  };
})();
