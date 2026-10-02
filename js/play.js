// 第七轮：首级新玩法 —— 熔魂炉 / 魂球道 / 闲聊共鸣 / 盗魂灵 / 化妆台 / 轮回
// 通过 G.HOOK（frame / e / click / tip）挂进主循环；轮回数据存在独立的 localStorage 键，不随存档清空。
window.Play = (() => {
  const META_KEY = 'soulhead_meta';
  const M = { cores: 0, total: 0, rb: 0, perk: {}, carry: null, codex: null, pending: 0, best: 0 };
  try { Object.assign(M, JSON.parse(localStorage.getItem(META_KEY) || '{}')); } catch (e) {}
  const saveM = () => { try { localStorage.setItem(META_KEY, JSON.stringify(M)); } catch (e) {} };
  const V3 = THREE.Vector3;
  const fmt = n => (window.G && G.fmtN) ? G.fmtN(n) : String(Math.round(n));
  const RB = () => !window.Mods || Mods.on('rebirth');
  const lv = k => M.perk[k] || 0;
  const startCoins = l => l ? Math.round(500 * Math.pow(2.2, l - 1)) : 0;
  const autoI = l => Math.max(0.8, 6 / (1 + l * 0.6));
  const PERKS = [
    { k: 'fire', icon: '🔥', n: '魂火', d: l => `全部产出 +${l * 25}%`, max: 20, cost: l => 2 + l },
    { k: 'fate', icon: '🍀', n: '天命', d: l => `远征幸运 +${l}（更高稀有度 / 异色）`, max: 10, cost: l => 3 + l * 2 },
    { k: 'legacy', icon: '💰', n: '遗产', d: l => `轮回后初始魂晶 ${fmt(startCoins(l))}`, max: 8, cost: l => 2 + l },
    { k: 'bond', icon: '🪢', n: '执念', d: l => `轮回时带走 ${l} 颗最珍贵的首级`, max: 6, cost: l => 4 + l * 2 },
    { k: 'bag', icon: '🎒', n: '魂囊', d: l => `背篓容量 +${l}`, max: 4, cost: l => 5 + l * 3 },
    { k: 'hand', icon: '👻', n: '幽手', d: l => l ? `幽灵之手每 ${autoI(l).toFixed(1)} 秒替你把玩一颗首级` : '幽灵之手替你自动把玩首级', max: 8, cost: l => 4 + l * 2 },
    { k: 'forge', icon: '⚗️', n: '炉心', d: l => `熔魂额外升阶概率 +${l * 8}%`, max: 5, cost: l => 3 + l * 2 },
    { k: 'hunt', icon: '🗡️', n: '猎魂', d: l => `击散盗魂灵的奖励 ×${(1 + l * 0.5).toFixed(1)}`, max: 6, cost: l => 2 + l }
  ];
  const api = {
    mul: () => RB() ? (1 + 0.25 * lv('fire')) * (1 + 0.1 * (M.rb || 0)) : 1,
    luck: () => RB() ? lv('fate') : 0,
    cap: () => RB() ? lv('bag') : 0,
    get meta() { return M; }, PERKS
  };

  // ---------------- 样式 ----------------
  const css = document.createElement('style');
  css.textContent = `
  .hbub{position:fixed;z-index:6;pointer-events:none;transform:translate(-50%,-100%);max-width:260px;padding:7px 12px;border-radius:18px;background:rgba(30,34,60,.72);color:#dfe6ff;font-style:italic;border:1px dashed rgba(180,200,255,.5);font:italic 500 13px/1.4 system-ui,'PingFang SC','Microsoft YaHei',sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35);opacity:0;transition:opacity .25s, transform .25s}
  .hbub.in{opacity:1;transform:translate(-50%,-112%)}
  .hbub:after{content:'';position:absolute;left:46%;bottom:-12px;width:8px;height:8px;border-radius:50%;background:rgba(30,34,60,.72)}
  .hbub small{display:block;font-weight:500;font-size:11px;color:#9a6a80;margin-bottom:1px}
  .pmodal{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(8,4,10,.62);backdrop-filter:blur(3px);font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif}
  .pbox{width:min(720px,94vw);max-height:88vh;overflow:auto;background:linear-gradient(160deg,#241820,#140c12);border:1px solid #6a4a5a;border-radius:18px;padding:20px 22px;color:#f3e6ea;box-shadow:0 20px 60px rgba(0,0,0,.6)}
  .pbox h2{margin:0 0 4px;font-size:22px}.pbox .sub{color:#c9a9b8;font-size:13px;margin-bottom:14px}
  .pbox h3{margin:14px 0 8px;font-size:15px;color:#ffc8dc}
  .prow{display:flex;flex-wrap:wrap;gap:8px}
  .pbtn{border:1px solid #6a4a5a;background:#2e1f28;color:#f3e6ea;border-radius:11px;padding:8px 12px;font-size:14px;cursor:pointer;transition:transform .1s,background .15s}
  .pbtn:hover{background:#4a2e3c;transform:translateY(-1px)}.pbtn.on{background:#7a2e50;border-color:#ff7aa8}.pbtn:disabled{opacity:.4;cursor:default;transform:none}
  .pbtn.big{font-size:17px;padding:12px 20px;background:linear-gradient(135deg,#7a2e50,#4a1a60);border-color:#ff9ac8}
  .sw{width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,255,255,.25);cursor:pointer}.sw:hover{transform:scale(1.12)}
  .perk{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid #4a3440;border-radius:12px;background:#1e141a;margin-bottom:8px}
  .perk .pi{font-size:26px;width:36px;text-align:center}.perk .pt{flex:1}.perk .pt b{font-size:15px}.perk .pt small{display:block;color:#c9a9b8;font-size:12px}
  .perk .lvl{font-size:12px;color:#ffd27a;margin-left:6px}
  .pclose{float:right;font-size:14px}
  .strike{position:fixed;left:50%;top:34%;z-index:30;transform:translate(-50%,-50%) scale(.3);font:900 76px/1 system-ui,sans-serif;color:#ffe27a;text-shadow:0 0 24px #ff8a00,0 6px 0 #a02a00,0 0 60px #ff4a00;letter-spacing:4px;pointer-events:none;opacity:0;transition:transform .35s cubic-bezier(.2,1.6,.4,1),opacity .3s}
  .strike.in{opacity:1;transform:translate(-50%,-50%) scale(1)} .strike small{display:block;text-align:center;font-size:24px;color:#fff;letter-spacing:1px;margin-top:6px}`;
  document.head.appendChild(css);

  // ---------------- 工具 ----------------
  const _v = new V3();
  function screen(p) { _v.copy(p).project(G.camera); return { x: (_v.x + 1) / 2 * innerWidth, y: (1 - _v.y) / 2 * innerHeight, vis: _v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1 }; }
  const CAT = () => window.BuildCat;
  const typeOf = b => (CAT()[b.type] || {});
  const sfx = (n, v, r) => { try { SFX.play(n, v, r); } catch (e) {} };
  const now = () => G.clock.elapsedTime;
  const RARN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
  let bigBanner = null;
  function banner(txt, sub, col) {
    if (!bigBanner) { bigBanner = document.createElement('div'); bigBanner.className = 'strike'; document.body.appendChild(bigBanner); }
    bigBanner.innerHTML = txt + (sub ? `<small>${sub}</small>` : ''); bigBanner.style.color = col || '#ffe27a';
    bigBanner.classList.remove('in'); void bigBanner.offsetWidth; bigBanner.classList.add('in');
    clearTimeout(bigBanner._t); bigBanner._t = setTimeout(() => bigBanner.classList.remove('in'), 1600);
  }
  function confetti(p, n = 5) { const cols = ['#ffe27a', '#ff7aa8', '#7ad0ff', '#b89aff', '#9aff9a']; for (let i = 0; i < n; i++) G.burst(p, cols[i % cols.length], 22, 2.4, 1.2, -3); }

  // =====================================================================
  // 1) 熔魂炉：三颗 → 一颗更高阶，继承魂印
  // =====================================================================
  const forging = [];
  const FEE = [60, 180, 600, 1800, 5000];
  function fusePlan(b) {
    const hs = b.heads.filter(Boolean); if (hs.length < 3) return null;
    const rars = hs.map(h => h.rec.c.rar), mx = Math.max(...rars), same = rars.every(r => r === rars[0]);
    return { hs, mx, same, target: Math.min(4, mx + (same ? 1 : 0)), fee: FEE[Math.min(4, mx + (same ? 1 : 0))] };
  }
  function fuse(b) {
    const P = fusePlan(b);
    if (!P) { G.toast(`熔魂炉需要放满 3 颗首级（现在 ${b.heads.filter(Boolean).length}/3）`, '#ffb070', 2.2); SFX.deny(); return; }
    if (b.busy) return;
    if (G.S.coins < P.fee) { G.toast(`开炉需要 ${fmt(P.fee)} 魂晶`, '#ff8a8a', 2); SFX.deny(); return; }
    G.addCoins(-P.fee);
    let target = P.target, bonus = false;
    if (!P.same && target < 4 && Math.random() < 0.3 + lv('forge') * 0.08) { target++; bonus = true; }
    const affs = [...new Set(P.hs.flatMap(h => h.rec.c.aff || []))];
    const shinyIn = P.hs.filter(h => h.rec.c.shiny).length;
    const godTriple = P.same && P.mx === 4;
    b.busy = true;
    const center = new V3(b.x, 0.75, b.z);
    const list = P.hs.map((h, i) => { G.unmount(h); const k = G.heads.indexOf(h); if (k >= 0) G.heads.splice(k, 1); h.blob.visible = false; if (h.aura) h.aura.visible = false; return { h, p0: h.g.position.clone(), a0: Math.atan2(h.g.position.z - b.z, h.g.position.x - b.x) }; });
    forging.push({ b, list, t: 0, center, target, affs, shinyIn, godTriple, bonus, done: false });
    SFX.play('heavy', 0.5, 0.6); sfx('bell', 0.5, 0.6);
    G.toast(`⚗️ 熔魂炉开炉！${P.same ? '三颗同阶 → 必定升阶' : bonus ? '炉火暴走 → 升阶！' : ''}`, '#ffb070', 2.5);
  }
  function tickForge(dt) {
    for (let i = forging.length - 1; i >= 0; i--) {
      const F = forging[i]; F.t += dt;
      const T = 2.2, p = Math.min(1, F.t / T);
      F.list.forEach((o, j) => {
        const a = o.a0 + p * p * Math.PI * 3, r = (1 - p) * 0.6, y = o.p0.y + Math.sin(p * Math.PI) * 0.5 - p * p * 0.25;
        o.h.g.position.set(F.b.x + Math.cos(a) * r, y, F.b.z + Math.sin(a) * r);
        o.h.g.rotation.y += dt * (2 + p * 10);
        o.h.g.scale.setScalar(Math.max(0.02, 1 - Math.pow(p, 3)));
        if (Math.random() < 0.5) G.burst(o.h.g.position, j % 2 ? '#ff8a3a' : '#ffd27a', 3, 0.5, 0.5, 1);
      });
      const mol = F.b.g.userData.molten; if (mol) mol.material.color.setRGB(1 + p * 1.2, 0.35 + p * 0.8, 0.08 + p * 0.5);
      if (p >= 1 && !F.done) {
        F.done = true;
        F.list.forEach(o => { o.h.g.scale.setScalar(1); G.removeHead(o.h); });
        let rec;
        try {
          const raw = RPG.forgeHead(G.S, F.target, (Math.random() * 4294967296) >>> 0, G.usedNames, G.usedSig, 2 + lv('fate'));
          const c = raw.c; c.aff = c.aff || [];
          const pool = F.affs.filter(k => !c.aff.includes(k));
          const nInh = pool.length ? (Math.random() < 0.35 ? 2 : 1) : 0;
          for (let k = 0; k < nInh && pool.length && c.aff.length < 4; k++) c.aff.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
          if (!c.shiny && (F.godTriple || (F.shinyIn && Math.random() < 0.34 * F.shinyIn))) { c.shiny = 1; raw.look.shiny = 1 + Math.floor(Math.random() * 4); raw.look.glowEye = 1; }
          c.forged = 1;
          rec = G.addHeadRecs([raw])[0]; if (!rec) throw new Error('vault full');
        } catch (e) { console.warn('forge', e); F.b.busy = false; forging.splice(i, 1); continue; }
        const key = rec.c.race + '|' + rec.c.id, isNew = !G.S.codex[key]; G.S.codex[key] = (G.S.codex[key] || 0) + 1; if (rec.c.shiny) G.S.shinySeen = (G.S.shinySeen || 0) + 1;
        const h = G.createHead(rec, F.center.clone().add(new V3(0, 0.25, 0)));
        const to = new V3().subVectors(G.player.pos, F.center); to.y = 0; to.normalize();
        h.vel.set(to.x * 1.6, 3.6, to.z * 1.6); h.av.set(Math.random() * 6 - 3, Math.random() * 8 - 4, 0);
        const col = rec.c.shiny ? '#fff2b0' : G.RAR[rec.c.rar].c;
        G.burst(F.center, '#ff8a3a', 90, 3.2, 1.2, 2); G.burst(F.center, col, 60, 2.4, 1.4, 0.5); G.flash(col + '99');
        setTimeout(() => { G.spawnBeam(h.g.position, col, rec.c.rar, rec.c.shiny); G.gachaCard(rec, isNew); }, 650);
        SFX.play('heavy', 0.6, 0.8); SFX.fanfare(Math.max(1, rec.c.rar)); SFX.soul && SFX.soul();
        G.toast(`⚗️ 熔炼成功：【${RARN[rec.c.rar]}】${NM(rec.c)}${rec.c.shiny ? ' ✨异色' : ''}${(rec.c.aff || []).length ? ' · 魂印 ' + rec.c.aff.map(k => RPG.AFF[k] ? RPG.AFF[k].n : k).join('/') : ''}`, col, 4);
        M.fused = (M.fused || 0) + 1; saveM(); G.save();
        setTimeout(() => { F.b.busy = false; if (mol) mol.material.color.set('#ff5a14'); }, 900);
        forging.splice(i, 1);
      }
    }
    for (const b of G.builds) if (b.type === 'forge' && b.g.userData.runes && !b.busy) { const k = b.heads.filter(Boolean).length; b.g.userData.runes.material.opacity = 0.35 + k * 0.15 + Math.sin(now() * (2 + k)) * 0.1; }
  }

  // =====================================================================
  // 2) 魂球道
  // =====================================================================
  const _p = new V3(), _q = new THREE.Quaternion();
  function tickBowling(dt) {
    for (const b of G.builds) {
      if (b.type !== 'bowling') continue;
      const pins = b.g.userData.pins; if (!pins) continue;
      const L = b.bowl || (b.bowl = { active: false, t: 0, last: 0, h: null, streak: 0, reset: 0 });
      // 碰撞检测
      for (const h of G.heads) {
        if (h === G.held || h.mount) continue;
        const sp2 = h.vel.x * h.vel.x + h.vel.z * h.vel.z; if (sp2 < 0.6) continue;
        if (h.g.position.y > 0.75) continue;
        for (const pin of pins) {
          if (pin.fall > 0 || L.reset > 0) continue;
          b.g.localToWorld(_p.copy(pin.base));
          const dx = h.g.position.x - _p.x, dz = h.g.position.z - _p.z;
          if (dx * dx + dz * dz < 0.23 * 0.23) knock(b, pin, h, new V3(h.vel.x, 0, h.vel.z));
        }
      }
      // 连锁 & 倒下动画
      for (const pin of pins) {
        if (pin.fall > 0 && pin.fall < 1) {
          pin.fall = Math.min(1, pin.fall + dt * (2 + pin.fall * 4));
          const ax = new V3(pin.dir.z, 0, -pin.dir.x).normalize();
          pin.g.quaternion.setFromAxisAngle(ax, pin.fall * Math.PI / 2 * 1.02);
          pin.g.position.copy(pin.base).addScaledVector(pin.dir, pin.fall * 0.19);
          if (pin.fall > 0.45 && !pin.chained) { pin.chained = true; for (const o of pins) if (o !== pin && o.fall === 0 && o.base.distanceTo(pin.base) < 0.36 && Math.random() < 0.75) { const d = new V3().subVectors(o.base, pin.base).setY(0).normalize().lerp(pin.dir, 0.4).normalize(); knockLocal(b, o, L.h, d); } }
        }
      }
      if (L.active) {
        L.t += dt;
        if (L.t - L.last > 1.8) {
          L.active = false;
          const n = pins.filter(p => p.fall > 0).length, h = L.h;
          if (n === 6) {
            L.streak++;
            const mult = 12 * (1 + (L.streak - 1) * 0.5);
            const end = b.g.localToWorld(new V3(0, 0.6, -1.7));
            if (h && G.heads.includes(h)) G.trigger(h, 'auto', mult);
            banner('STRIKE!', L.streak > 1 ? `${L.streak} 连全中 · ×${mult.toFixed(0)}` : `全中 · ×${mult.toFixed(0)}`);
            confetti(end, 6); G.flash('rgba(255,200,60,0.55)'); SFX.fanfare(3); sfx('bell', 0.6, 1.5);
            M.strikes = (M.strikes || 0) + 1; M.best = Math.max(M.best || 0, L.streak); saveM();
          } else if (n > 0) {
            if (L.streak > 1) G.toast(`连击中断（${L.streak} 连）`, '#ccc', 1.5);
            L.streak = 0;
            if (h && G.heads.includes(h)) G.trigger(h, 'auto', n * 1.5);
            banner(`${n} 瓶`, n >= 5 ? '差一点！' : '', '#9adfff');
          }
          L.reset = 1.4;
        }
      }
      if (L.reset > 0) {
        L.reset -= dt;
        if (L.reset <= 0) { for (const p of pins) { p.fall = 0; p.chained = false; p.g.quaternion.identity(); p.g.position.copy(p.base); p.g.scale.setScalar(0.01); p.up = 0.001; } sfx('plate', 0.4, 1.4); }
      }
      for (const p of pins) if (p.up > 0) { p.up = Math.min(1, p.up + dt * 4); const s = p.up < 1 ? 1 + Math.sin(p.up * Math.PI) * 0.25 : 1; p.g.scale.setScalar(Math.max(0.01, p.up) * s * 1.35); if (p.up >= 1) { p.up = 0; p.g.scale.setScalar(1.35); } }
    }
  }
  function knock(b, pin, h, worldDir) {
    b.g.getWorldQuaternion(_q); const d = worldDir.clone().applyQuaternion(_q.invert()); d.y = 0; if (d.lengthSq() < 1e-6) d.set(0, 0, -1); d.normalize();
    knockLocal(b, pin, h, d);
    h.vel.multiplyScalar(0.82);
  }
  function knockLocal(b, pin, h, d) {
    if (pin.fall > 0) return;
    pin.fall = 0.02; pin.dir.copy(d);
    const L = b.bowl; if (!L.active) { L.active = true; L.t = 0; L.h = h; } L.last = L.t; if (h) L.h = h;
    const wp = b.g.localToWorld(pin.base.clone().add(new V3(0, 0.2, 0)));
    G.burst(wp, '#e6dcc4', 10, 1.2, 0.5, -6); sfx('wood', 0.5, 0.8 + Math.random() * 0.5);
  }

  // =====================================================================
  // 3) 闲聊共鸣：相邻两颗首级偶尔聊天，聊完双方 20 秒 ×2 产出（同族 ×3 由共鸣系统叠加）
  // =====================================================================
  const BANTER = [
    ['喂，你也是被他装进麻袋带回来的？', '嗯。麻袋里好挤，还有股土豆味。'],
    ['你的发型真好看，在哪儿做的？', '……现在问这个还有意义吗？'],
    ['今天他又来戳我的脸了。', '习惯就好，就当是按摩吧。'],
    ['你说我们俩谁更值钱？', '当然是我，我可是有魂印的。'],
    ['这里的篝火倒挺暖和。', '比我生前住的地方强多了。'],
    ['展示柜那位好像是圣魂级的。', '哼，不就是会转圈嘛。'],
    ['我昨晚梦见自己长出了身体。', '别做梦了，梦里也没有脖子。'],
    ['那个大块头又在对着我们傻笑。', '他大概觉得我们很可爱吧。'],
    ['好无聊啊，来玩瞪眼游戏吧。', '……你先眨眼了。'],
    ['听说熔魂炉能把三颗头炼成一颗。', '别看我，我可不想被炼。'],
    ['那个地精行商可信吗？', '地精的话，只能信一半。'],
    ['球道那边好吵。', '有人被当成保龄球扔出去了……幸好不是我。'],
    ['我以前可是{idA}，一剑能劈开城门。', '我以前是{idB}。现在我们一样高了。'],
    ['你觉得他最喜欢哪一颗？', '反正不是你，他昨天摸了我三次。'],
    ['嘘——他过来了，装睡。', '……zzZ'],
    ['如果能许一个愿望，你想要什么？', '一个会挠痒的幽灵之手。'],
    ['你闻到了吗？是魂晶的味道。', '那是你的错觉，饿鬼。'],
    ['我在想，我们算不算一种收藏品。', '当然算，还是限定款。']
  ];
  const BAN_HW = [['{nameB}，你的{hwB}好可爱。', '谢谢，是来这儿以后才戴上的。'], ['{hwA}会不会有点显眼？', '很适合你，真的。']];
  const BAN_RACE = [['同族的气息……你也是{raceA}？', '是啊，真巧。以后互相照应吧。'], ['家乡的歌你还记得吗？', '记得。我唱给你听。♪']];
  const bubbles = [];
  let chatT = 40;
  function fill(s, A, B) {
    const hwA = window.HeadWear ? HeadWear.names(A.rec.look.hw)[0] : '', hwB = window.HeadWear ? HeadWear.names(B.rec.look.hw)[0] : '';
    return s.replace('{nameA}', A.rec.c.name).replace('{nameB}', B.rec.c.name).replace('{idA}', A.rec.c.idN || '勇士').replace('{idB}', B.rec.c.idN || '勇士')
      .replace('{raceA}', A.rec.c.raceN || '').replace('{hwA}', hwA || '头饰').replace('{hwB}', hwB || '头饰');
  }
  function say(h, txt, delay, dur) {
    const el = document.createElement('div'); el.className = 'hbub'; el.innerHTML = `<small>${NM(h.rec.c)}</small>${txt}`; document.body.appendChild(el);
    bubbles.push({ h, el, t: -delay, dur });
  }
  function tickChat(dt) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const o = bubbles[i]; o.t += dt;
      const hidden = G.uiOpen || (window.Seance && Seance.active) || !G.heads.includes(o.h);
      if (o.t > o.dur || !G.heads.includes(o.h)) { o.el.remove(); bubbles.splice(i, 1); continue; }
      if (o.t < 0 || hidden) { o.el.classList.remove('in'); continue; }
      const s = screen(o.h.g.position.clone().add(new V3(0, 0.32, 0)));
      if (!s.vis || G.camera.position.distanceTo(o.h.g.position) > 9) { o.el.classList.remove('in'); continue; }
      o.el.style.left = s.x + 'px'; o.el.style.top = s.y + 'px';
      o.el.classList.toggle('in', o.t < o.dur - 0.3);
    }
    if (!G.playing || G.uiOpen || G.cine) return;
    chatT -= dt; if (chatT > 0) return;
    chatT = 45 + Math.random() * 60;
    startChat();
  }
  // 第八轮：首级不会说话。改为低频「残响」——她残魂里浮起的一段记忆碎片（思绪气泡，不是台词）
  const ECHO = [
    c => `（……${c.locN || '故乡'}的风，好像还带着麦子的味道……）`,
    c => `（……“${c.goal || '我想活下去'}”……那是谁的愿望来着……）`,
    c => `（……${c.belief || '神'}……没有回应……）`,
    c => `（……作为${c.idN || '旅人'}的最后一天，天气很好……）`,
    c => `（……有人在叫她的名字：${c.name}……）`,
    c => `（……${c.raceN || ''}的摇篮曲，只记得半句……）`,
    c => `（……母亲说过，要早点回家……）`,
    c => `（……那天早上的面包还没吃完……）`,
    c => `（……篝火的噼啪声，和那夜营地里的一模一样……）`,
    c => `（……她想起了自己的${(c.traits && c.traits[0]) || '倔强'}……如今也没用了……）`
  ];
  function startChat() {
    const near = G.heads.filter(h => h !== G.held && h.g.position.distanceTo(G.player.pos) < 7);
    if (!near.length) return;
    const A = near[Math.floor(Math.random() * near.length)];
    const f = ECHO[Math.floor(Math.random() * ECHO.length)];
    say(A, f(A.rec.c), 0, 4.5);
    const until = now() + 20;
    const nb = G.heads.filter(h => h !== A && h.g.position.distanceTo(A.g.position) < 1.05).slice(0, 3);
    setTimeout(() => { for (const h of [A].concat(nb)) if (G.heads.includes(h)) { h.buff = until; G.floatText('✧ 残响 ×2', h.g.position.clone().add(new V3(0, 0.5, 0)), '#c8d8ff', 15); } }, 2000);
    M.chats = (M.chats || 0) + 1; return true;
  }

  // =====================================================================
  // 4) 盗魂灵：定期来偷展出的首级，左键把它打散
  // =====================================================================
  let thief = null, thiefT = 240 + Math.random() * 120;
  const ghostMat = new THREE.MeshBasicMaterial({ color: '#b48aff', transparent: true, opacity: 0.55, depthWrite: false });
  function makeThief() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), ghostMat.clone()); body.scale.set(1, 1.15, 1); g.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.42, 16, 1, true), ghostMat.clone()); tail.position.y = -0.3; tail.rotation.x = Math.PI; tail.raycast = () => {}; g.add(tail);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#e0c8ff').multiplyScalar(1.4) })); core.raycast = () => {}; g.add(core);
    const eyeM = new THREE.MeshBasicMaterial({ color: '#1a0a2a' });
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeM); e.scale.set(0.8, 1.3, 0.5); e.position.set(sx * 0.07, 0.04, 0.18); e.raycast = () => {}; g.add(e); const hl = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), new THREE.MeshBasicMaterial({ color: '#fff' })); hl.position.set(sx * 0.07 + 0.01, 0.06, 0.2); hl.raycast = () => {}; g.add(hl); }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 4, 10, Math.PI), eyeM); mouth.position.set(0, -0.04, 0.19); mouth.rotation.z = Math.PI; mouth.raycast = () => {}; g.add(mouth);
    return { g, body };
  }
  function spawnThief() {
    const targets = G.heads.filter(h => h.mount && !typeOf(h.mount).forge);
    if (targets.length < 3) return false;
    targets.sort((a, b) => b.rec.c.rar - a.rec.c.rar);
    const tgt = Math.random() < 0.6 ? targets[0] : targets[Math.floor(Math.random() * targets.length)];
    const T = makeThief(); const ex = G.cave.exitPos.clone(); T.g.position.set(ex.x, 1.8, ex.z); G.scene.add(T.g);
    const depth = G.S.depth || 1;
    thief = { ...T, tgt, state: 'seek', hp: 6 + depth * 2, hp0: 6 + depth * 2, carry: null, hitT: 0, t: 0 };
    G.toast('⚠️ 盗魂灵潜进洞窟了！它盯上了「' + NM(tgt.rec.c) + '」——对准它狂点左键把它打散！', '#c79aff', 5);
    sfx('bell', 0.6, 0.5); SFX.heartbeat && SFX.heartbeat();
    return true;
  }
  function killThief(win) {
    if (!thief) return;
    const p = thief.g.position.clone();
    if (thief.carry) { const h = thief.carry; if (!G.heads.includes(h)) G.heads.push(h); h.blob.visible = true; h.vel.set(0, 1, 0); h.sleep = 0; thief.carry = null; }
    if (win) {
      const val = Math.round(80 * Math.pow(1.9, (G.S.depth || 1)) * api.mul() * (1 + lv('hunt') * 0.5) * (1 + G.exhibit().tier * 0.08));
      G.addCoins(val); G.floatText('+' + fmt(val), p.clone().add(new V3(0, 0.3, 0)), '#e0c8ff', 30);
      G.burst(p, '#c79aff', 120, 3.4, 1.4, 0.5); G.burst(p, '#ffffff', 40, 2, 0.8, 0); confetti(p, 3);
      banner('击散！', `盗魂灵化作 ${fmt(val)} 魂晶`, '#e0c8ff'); SFX.fanfare(2); SFX.play('heavy', 0.5, 1.3);
      for (let i = 0; i < 8; i++) setTimeout(() => G.soulWisp(p.clone().add(new V3(Math.random() - 0.5, Math.random() * 0.4, Math.random() - 0.5)), '#c79aff'), i * 60);
      M.thieves = (M.thieves || 0) + 1; saveM();
    }
    G.scene.remove(thief.g); thief.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== ghostMat) o.material.dispose(); });
    thief = null;
  }
  function tickThief(dt) {
    if (!thief) {
      if (!G.playing || G.uiOpen || G.cine) return;
      thiefT -= dt; if (thiefT <= 0) { thiefT = 300 + Math.random() * 240; spawnThief(); }
      return;
    }
    const T = thief; T.t += dt; T.hitT = Math.max(0, T.hitT - dt);
    const bob = Math.sin(T.t * 3) * 0.06;
    T.body.material.color.set(T.hitT > 0 ? '#ffffff' : '#b48aff'); T.body.material.opacity = 0.45 + 0.15 * Math.sin(T.t * 6);
    const sc = 1 + T.hitT * 1.5; T.g.scale.setScalar(sc);
    if (Math.random() < 0.25) G.burst(T.g.position.clone().add(new V3(0, -0.3, 0)), '#9a6aff', 1, 0.3, 0.6, 0.5);
    const face = (tx, tz) => { T.g.rotation.y = Math.atan2(tx - T.g.position.x, tz - T.g.position.z); };
    if (T.state === 'seek') {
      if (!T.tgt || !G.heads.includes(T.tgt) || !T.tgt.mount) { const alt = G.heads.filter(h => h.mount && !typeOf(h.mount).forge); if (!alt.length) { T.state = 'flee'; } else T.tgt = alt[Math.floor(Math.random() * alt.length)]; return; }
      const tp = T.tgt.g.position.clone().add(new V3(0, 0.38, 0));
      const d = tp.clone().sub(T.g.position); const L = d.length();
      if (L < 0.12) { T.state = 'grab'; T.gt = 0; G.unmount(T.tgt); const k = G.heads.indexOf(T.tgt); if (k >= 0) G.heads.splice(k, 1); T.tgt.blob.visible = false; T.carry = T.tgt; G.toast(`盗魂灵抓走了「${T.tgt.rec.c.name}」！快追上去打它！`, '#ff9aa8', 3); SFX.play('heavy', 0.4, 1.6); return; }
      T.g.position.addScaledVector(d.normalize(), Math.min(L, dt * 0.85)); T.g.position.y += bob * dt; face(tp.x, tp.z);
    } else if (T.state === 'grab' || T.state === 'flee') {
      const ex = G.cave.exitPos; const tp = new V3(ex.x, 1.7, ex.z);
      const d = tp.clone().sub(T.g.position); const L = d.length();
      T.g.position.addScaledVector(d.normalize(), Math.min(L, dt * 1.0)); face(tp.x, tp.z);
      if (T.carry) { T.carry.g.position.copy(T.g.position).add(new V3(0, -0.36 + bob, 0)); T.carry.g.rotation.y += dt * 0.8; }
      if (L < 0.2) {
        const stolen = Math.round(G.S.coins * 0.06);
        if (stolen > 0) G.addCoins(-stolen);
        G.toast(`盗魂灵逃走了……偷走 ${fmt(stolen)} 魂晶${T.carry ? `，「${NM(T.carry.rec.c)}」被丢在了洞口` : ''}。`, '#ff9aa8', 4);
        killThief(false);
      }
    }
  }
  const ray = new THREE.Raycaster();
  function aimThief() { if (!thief) return null; ray.setFromCamera({ x: 0, y: 0 }, G.camera); const r = ray.intersectObject(thief.body, false)[0]; return r && r.distance < 14 ? r : null; }
  function hitThief() {
    const r = aimThief(); if (!r) return false;
    thief.hp--; thief.hitT = 0.12;
    G.burst(r.point, '#e0c8ff', 18, 1.6, 0.6, 0); SFX.punch(); SFX.play('squish', 0.4, 1.6);
    G.floatText(thief.hp > 0 ? '💥' : '✨', r.point.clone().add(new V3(0, 0.15, 0)), '#fff', 20);
    const back = new V3().subVectors(thief.g.position, G.camera.position).setY(0).normalize(); thief.g.position.addScaledVector(back, 0.12);
    if (thief.hp <= 0) killThief(true);
    return true;
  }

  // =====================================================================
  // 5) 幽灵之手（轮回天赋）：自动把玩
  // =====================================================================
  let handT = 3;
  function tickHand(dt) {
    const l = lv('hand'); if (!l || !G.playing || G.uiOpen) return;
    handT -= dt; if (handT > 0) return; handT = autoI(l);
    const near = G.heads.filter(h => h !== G.held && h.g.position.distanceTo(G.player.pos) < 12);
    if (!near.length) return;
    const h = near[Math.floor(Math.random() * near.length)];
    G.trigger(h, 'auto', 0.6); G.soulWisp(h.g.position.clone().add(new V3(0, 0.3, 0)), '#9adfff');
  }

  // =====================================================================
  // 6) 化妆台
  // =====================================================================
  let modal = null;
  function openModal(html, onClick) {
    closeModal(true);
    modal = document.createElement('div'); modal.className = 'pmodal'; modal.innerHTML = `<div class="pbox">${html}</div>`;
    modal.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (t && !t.disabled) onClick(t.dataset.a, t); else if (e.target === modal) closeModal(); });
    document.body.appendChild(modal); G.setUIOpen(true); SFX.open();
  }
  function closeModal(silent) {
    if (!modal) return; modal.remove(); modal = null;
    if (!silent) { G.setUIOpen(false); SFX.close(); G.save(); try { G.lockPointer(); } catch (e) {} }
  }
  addEventListener('keydown', e => { if (modal && !e.repeat && (e.code === 'Escape' || e.code === 'KeyE')) { e.stopPropagation(); e.preventDefault(); closeModal(); } }, true);
  const FACES = [['安眠', { blink: 1, relaxed: 0.3 }], ['微笑', { happy: 0.75, blink: 0.1 }], ['惊讶', { surprised: 0.85, oh: 0.45 }], ['委屈', { sad: 0.85, blink: 0.2 }], ['生气', { angry: 0.85 }], ['失焦', { blink: 0.05, surprised: 0.35 }], ['半阖', { blink: 0.55, aa: 0.12 }], ['吐舌', { happy: 0.5, aa: 0.35 }]];
  const FACE_ALL = () => FACES.map(([n, ex]) => ({ n, ex, fx: [0, 0, 0, 0] })).concat((ModelHeads.FACES || []).map(f => ({ n: f.n, ex: f.ex, fx: f.fx, rl: f.rl || null, tg: f.tg || 0 })));
  const FX_N = ['泪痕', '鼻血', '口角血', '淄青'], FX_L = [0, 0.5, 0.8, 1];
  const HW_KEYS = ['ribbon', 'twinbows', 'hairpins', 'star', 'kanzashi', 'bells', 'feather', 'maid', 'bunny', 'flowercrown', 'goggles', 'thorncrown', 'beret', 'minihat', 'halo', 'horns', 'dropchain', 'headchain', 'wingpin', 'crescent', 'skullpin'];
  const HW_ICON = { ribbon: '🎀', twinbows: '🎀', hairpins: '📎', star: '⭐', kanzashi: '🌸', bells: '🔔', feather: '🪶', maid: '🤍', bunny: '🐰', flowercrown: '💐', goggles: '🥽', thorncrown: '👑', beret: '🎨', minihat: '🎩', halo: '😇', horns: '😈', dropchain: '💎', headchain: '⛓', wingpin: '🪽', crescent: '🌙', skullpin: '💀' };
  function dressCost(h) { return 60 * (h.rec.c.rar + 1); }
  function openDresser(h) {
    const look = h.rec.look, hw = look.hw || [], cost = dressCost(h);
    const has = k => hw.some(e => e.k === k);
    const H = ModelHeads.HAIR.slice(0, 24);
    const mk = look.mk || [0, 0, 0];
    openModal(`<button class="pbtn pclose" data-a="close">✕ 关闭</button><h2>💄 化妆台 · ${NM(h.rec.c)}</h2>
      <div class="sub">头饰 / 染发每次 ${fmt(cost)} 魂晶；表情与妆容免费。当前魂晶 ${fmt(G.S.coins)}</div>
      <h3>🎀 头饰（最多 2 件，帽子与发箍互斥）</h3><div class="prow">${HW_KEYS.map(k => `<button class="pbtn ${has(k) ? 'on' : ''}" data-a="hw:${k}">${HW_ICON[k]} ${HeadWear.N[k]}</button>`).join('')}
        <button class="pbtn" data-a="hwcol">🎨 换配色</button><button class="pbtn" data-a="hwnone">🚫 摘掉全部</button></div>
      <h3>💇 染发</h3><div class="prow">${H.map(([n, c], i) => `<div class="sw" title="${n}" style="background:${c}" data-a="hair:${i}"></div>`).join('')}</div>
      <h3>😶 表情</h3><div class="prow">${FACE_ALL().map((f, i) => `<button class="pbtn ${look.exT === f.n ? 'on' : ''}" data-a="face:${i}">${f.n}</button>`).join('')}</div>
      <h3>🩸 脸部差分 <small style="opacity:.6;font-weight:400">（点击循环“无 / 轻 / 中 / 重”）</small></h3><div class="prow">${FX_N.map((n, i) => { const lv = FX_L.indexOf((look.fx || [])[i] || 0); return `<button class="pbtn ${lv > 0 ? 'on' : ''}" data-a="fx:${i}">${n} ${['无', '轻', '中', '重'][lv < 0 ? 2 : lv]}</button>`; }).join('')}</div>
      <h3>🌸 妆容</h3><div class="prow"><button class="pbtn ${mk[0] ? 'on' : ''}" data-a="mk:0">腮红</button><button class="pbtn ${mk[1] ? 'on' : ''}" data-a="mk:1">泪痣 ${['', '右', '左', '唇边'][mk[1]] || ''}</button><button class="pbtn ${mk[2] ? 'on' : ''}" data-a="mk:2">雀斑</button></div>`,
      (a) => {
        if (a === 'close') return closeModal();
        const [cmd, arg] = a.split(':');
        const pay = () => { if (G.S.coins < cost) { G.toast(`需要 ${fmt(cost)} 魂晶`, '#ff8a8a', 1.6); SFX.deny(); return false; } G.addCoins(-cost); return true; };
        if (cmd === 'hw') {
          let list = (look.hw || []).slice(); const i = list.findIndex(e => e.k === arg);
          if (i >= 0) list.splice(i, 1);
          else {
            if (!pay()) return;
            const g = HeadWear.GROUP[arg];
            list = list.filter(e => { const eg = HeadWear.GROUP[e.k]; return eg !== g && !((g === 'hat' && eg === 'band') || (g === 'band' && eg === 'hat')); });
            if (list.length >= 2) list.shift();
            list.push(HeadWear.item(arg));
          }
          look.hw = list;
        } else if (cmd === 'hwcol') { if (!(look.hw || []).length || !pay()) return; look.hw = look.hw.map(e => HeadWear.item(e.k)); }
        else if (cmd === 'hwnone') look.hw = [];
        else if (cmd === 'hair') { if (!pay()) return; const [n, c] = H[+arg]; look.hn = n; look.hc1 = c; look.hn2 = n; look.hc2 = c; if (look.hn3) look.hn3 = n; }
        else if (cmd === 'face') { const f = FACE_ALL()[+arg]; look.ex = f.ex; look.exT = f.n; look.fx = f.fx.slice(); look.rl = f.rl || null; look.tg = f.tg || 0; h.hb.setExpression && h.hb.setExpression(f.ex); h.hb.setFx && h.hb.setFx(look.fx); h.hb.setRoll && h.hb.setRoll(...(f.rl || [0, 0])); h.hb.setTongue && h.hb.setTongue((f.tg || 0) * 0.04, 0, (f.tg || 0) * 0.3); SFX.click(); openDresser(h); return; }
        else if (cmd === 'fx') { const a2 = (look.fx || [0, 0, 0, 0]).slice(); const i = +arg, lv = Math.max(0, FX_L.findIndex(v => v >= (a2[i] || 0))); a2[i] = FX_L[(lv + 1) % FX_L.length]; look.fx = a2; h.hb.setFx && h.hb.setFx(a2); SFX.click(); openDresser(h); return; }
        else if (cmd === 'mk') { const m = (look.mk || [0, 0, 0]).slice(); const k = +arg; m[k] = k === 1 ? (m[1] + 1) % 4 : (m[k] ? 0 : (k === 0 ? 0.75 : 1)); look.mk = m; }
        M.dressed = (M.dressed || 0) + 1; saveM();
        G.rebuildHead(h); h.hb.setExpression && h.hb.setExpression(look.ex || {});
        G.burst(h.g.position, '#ffc8dc', 24, 1.2, 0.8, 0.5); SFX.confirm();
        openDresser(h);
      });
  }

  // =====================================================================
  // 7) 轮回
  // =====================================================================
  const coresFor = S => Math.floor(Math.sqrt(((S.stats && S.stats.earned) || 0) / 4000));
  function openAltar() {
    const gain = coresFor(G.S), keep = lv('bond');
    const html = `<button class="pbtn pclose" data-a="close">✕ 关闭</button><h2>♻️ 轮回祭坛</h2>
      <div class="sub">第 ${M.rb || 0} 世 · 魂核 <b style="color:#9adfff">${M.cores}</b>（累计 ${M.total || 0}）· 每一世永久 +10% 产出</div>
      <div class="perk" style="border-color:#6a9aba"><div class="pi">🌀</div><div class="pt"><b>献祭这一世</b><small>本世累计获得 ${fmt((G.S.stats && G.S.stats.earned) || 0)} 魂晶 → 可凝结 <b style="color:#9adfff">${gain}</b> 魂核（需 ≥ 3）。洞窟、装备、魂晶全部归零；<b>图鉴永久保留</b>${keep ? `，带走产出最高的 ${keep} 颗首级` : ''}。</small></div>
        <button class="pbtn big" data-a="rebirth" ${gain < 3 ? 'disabled' : ''}>轮回 +${gain}</button></div>
      <h3>魂核天赋</h3>${PERKS.map(p => { const l = lv(p.k), c = p.cost(l), mx = l >= p.max; return `<div class="perk"><div class="pi">${p.icon}</div><div class="pt"><b>${p.n}</b><span class="lvl">Lv ${l}/${p.max}</span><small>${p.d(l)}${mx ? '' : ` → 下一级：${p.d(l + 1)}`}</small></div><button class="pbtn" data-a="perk:${p.k}" ${mx || M.cores < c ? 'disabled' : ''}>${mx ? '已满' : `💠 ${c}`}</button></div>`; }).join('')}
      <div class="sub" style="margin-top:10px">熔炼 ${M.fused || 0} 次 · 全中 ${M.strikes || 0} 次（最高 ${M.best || 0} 连）· 击散盗魂灵 ${M.thieves || 0} 只</div>`;
    openModal(html, a => {
      if (a === 'close') return closeModal();
      if (a === 'rebirth') { if (confirm(`确定轮回？这一世的洞窟、魂晶、装备都会清空，换取 ${gain} 魂核。`)) rebirth(); return; }
      const [cmd, k] = a.split(':');
      if (cmd === 'perk') { const p = PERKS.find(x => x.k === k), l = lv(k), c = p.cost(l); if (l >= p.max || M.cores < c) return; M.cores -= c; M.perk[k] = l + 1; saveM(); SFX.levelup && SFX.levelup(); openAltar(); }
    });
  }
  function rebirth() {
    const S = G.S, gain = coresFor(S); if (gain < 3) return;
    const keep = S.heads.slice().sort((a, b) => G.yieldOf(b) - G.yieldOf(a)).slice(0, lv('bond'));
    M.carry = keep.map(r => ({ c: r.c, look: r.look, sig: r.sig, mem: r.mem, story: r.story, app: r.app, date: r.date, calm: r.calm, seance: r.seance }));
    M.codex = Object.assign({}, M.codex || {}, S.codex || {});
    M.shinySeen = Math.max(M.shinySeen || 0, S.shinySeen || 0);
    M.cores += gain; M.total = (M.total || 0) + gain; M.rb = (M.rb || 0) + 1; M.pending = 1; saveM();
    G.save(); G.wipe(); modal && modal.remove();
    document.body.insertAdjacentHTML('beforeend', '<div style="position:fixed;inset:0;z-index:99;background:#000;display:flex;align-items:center;justify-content:center;color:#9adfff;font:600 28px system-ui">♻️ 轮回中……</div>');
    setTimeout(() => location.reload(), 1200);
  }
  function applyPending() {
    const S = G.S;
    if (M.codex) { S.codex = S.codex || {}; for (const k in M.codex) if (!S.codex[k]) S.codex[k] = M.codex[k]; }
    if (!M.pending) return;
    M.pending = 0;
    S.intro = S.intro || 1;
    const sc = startCoins(lv('legacy')); if (sc) G.addCoins(sc);
    if (M.carry && M.carry.length) { try { const recs = G.addHeadRecs(M.carry); G.createReturnBag(recs); } catch (e) { console.warn(e); } }
    M.carry = null; saveM(); G.save();
    setTimeout(() => G.toast(`♻️ 第 ${M.rb} 世开始了。魂核 ${M.cores} · 永久产出 ×${api.mul().toFixed(2)}${sc ? ` · 遗产 ${fmt(sc)} 魂晶` : ''}`, '#9adfff', 6), 1500);
  }

  // =====================================================================
  // 8) 魂潮：随机降临的 20 秒狂欢，全部产出 ×3
  // =====================================================================
  let surge = 0, surgeT = 150 + Math.random() * 150, surgeEl = null;
  function tickSurge(dt) {
    if (surge > 0) {
      surge -= dt;
      if (!surgeEl) { surgeEl = document.createElement('div'); surgeEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;box-shadow:inset 0 0 140px 40px rgba(255,190,60,.45);transition:opacity .5s'; document.body.appendChild(surgeEl); }
      surgeEl.style.opacity = G.uiOpen ? 0 : 0.6 + Math.sin(now() * 5) * 0.3;
      if (Math.random() < dt * 14 && G.heads.length) { const h = G.heads[Math.floor(Math.random() * G.heads.length)]; G.soulWisp(h.g.position.clone().add(new V3(0, 0.2, 0)), '#ffd27a'); }
      if (surge <= 0) { surgeEl.remove(); surgeEl = null; G.toast('魂潮退去了。', '#e6c7a0', 2); }
      return;
    }
    if (!G.playing || G.uiOpen || G.cine || G.heads.length < 3) return;
    surgeT -= dt; if (surgeT > 0) return;
    surgeT = 360 + Math.random() * 300; surge = 20;
    banner('魂潮来袭！', '20 秒内全部产出 ×3 —— 快去把玩！', '#ffd27a'); SFX.fanfare(2); G.flash('rgba(255,200,60,0.5)');
    M.surges = (M.surges || 0) + 1;
  }
  const baseMul = api.mul; api.mul = () => baseMul() * (surge > 0 ? 3 : 1);

  // =====================================================================
  // 9) 成就（跨轮回永久；奖励魂晶或魂核）
  // =====================================================================
  const nHeads = () => G.S.heads.length;
  const ACH = [
    ['h10', '初窥门径', '收藏 10 颗首级', () => nHeads() >= 10, 500],
    ['h50', '满室琳琅', '收藏 50 颗首级', () => nHeads() >= 50, 5000],
    ['h120', '首级博物馆', '收藏 120 颗首级', () => nHeads() >= 120, 1, 'core'],
    ['shiny1', '异色之光', '获得第一颗异色首级', () => (G.S.shinySeen || 0) >= 1, 3000],
    ['shiny5', '光谱收藏家', '累计获得 5 颗异色首级', () => (G.S.shinySeen || 0) + (M.shinySeen || 0) >= 5, 2, 'core'],
    ['god', '神魂降临', '拥有一颗神魂首级', () => G.S.heads.some(r => r.c.rar >= 4), 1, 'core'],
    ['aff3', '魂印满身', '拥有一颗带 3 条以上魂印的首级', () => G.S.heads.some(r => (r.c.aff || []).length >= 3), 4000],
    ['fuse1', '炉火初燃', '第一次熔魂', () => (M.fused || 0) >= 1, 800],
    ['fuse20', '熔魂宗师', '熔魂 20 次', () => (M.fused || 0) >= 20, 2, 'core'],
    ['strike1', '全中！', '第一次 STRIKE', () => (M.strikes || 0) >= 1, 600],
    ['strike3', '火鸡', '连续 3 次全中', () => (M.best || 0) >= 3, 1, 'core'],
    ['strike25', '球道之王', '累计 25 次全中', () => (M.strikes || 0) >= 25, 2, 'core'],
    ['thief1', '驱魂', '击散第一只盗魂灵', () => (M.thieves || 0) >= 1, 1000],
    ['thief15', '猎魂人', '击散 15 只盗魂灵', () => (M.thieves || 0) >= 15, 2, 'core'],
    ['chat30', '残响收集者', '目睹 30 次首级的记忆残响', () => (M.chats || 0) >= 30, 1500],
    ['dress', '造型师', '在化妆台打扮一颗首级', () => (M.dressed || 0) >= 1, 400],
    ['cx20', '见多识广', '图鉴收录 20 种身份', () => G.codexInfo().nIds >= 20, 3000],
    ['cx40', '百科全书', '图鉴收录 40 种身份', () => G.codexInfo().nIds >= 40, 2, 'core'],
    ['cxall', '万魂归一', '图鉴收录全部身份', () => G.codexInfo().nIds >= G.codexInfo().totalIds, 5, 'core'],
    ['exC', '小有名气', '展厅评级达到 C', () => G.exhibit().tier >= 3, 2000],
    ['exA', '远近闻名', '展厅评级达到 A', () => G.exhibit().tier >= 5, 2, 'core'],
    ['exSS', '传说展厅', '展厅评级达到 SS', () => G.exhibit().tier >= 7, 4, 'core'],
    ['e1m', '魂晶百万', '单世累计获得 100 万魂晶', () => (G.S.stats.earned || 0) >= 1e6, 2, 'core'],
    ['e100m', '魂晶亿万', '单世累计获得 1 亿魂晶', () => (G.S.stats.earned || 0) >= 1e8, 5, 'core'],
    ['deep', '深渊探索者', '洞窟挖到最深处', () => !BuildCat.DIG[G.S.depth], 2, 'core'],
    ['rb1', '初次轮回', '完成第一次轮回', () => (M.rb || 0) >= 1, 1, 'core'],
    ['rb5', '轮回者', '完成 5 次轮回', () => (M.rb || 0) >= 5, 5, 'core'],
    ['surge5', '逐浪者', '经历 5 次魂潮', () => (M.surges || 0) >= 5, 2500]
  ];
  let achT = 5;
  function tickAch(dt) {
    achT -= dt; if (achT > 0) return; achT = 3;
    M.ach = M.ach || {};
    for (const [k, n, d, chk, rw, kind] of ACH) {
      if (M.ach[k]) continue;
      let ok = false; try { ok = chk(); } catch (e) {}
      if (!ok) continue;
      M.ach[k] = Date.now();
      let txt;
      if (kind === 'core') { M.cores += rw; M.total = (M.total || 0) + rw; txt = `+${rw} 魂核`; }
      else { const v = Math.round(rw * Math.pow(1.6, (G.S.depth || 1) - 1)); G.addCoins(v); txt = `+${fmt(v)} 魂晶`; }
      saveM(); SFX.fanfare(1);
      G.toast(`🏅 成就达成「${n}」—— ${d} · ${txt}`, '#ffd27a', 5);
      break;
    }
  }
  function openAch() {
    M.ach = M.ach || {};
    const got = ACH.filter(a => M.ach[a[0]]).length;
    openModal(`<button class="pbtn pclose" data-a="close">✕ 关闭</button><h2>🏅 成就 ${got}/${ACH.length}</h2><div class="sub">成就跨轮回永久保留。魂核可在「轮回祭坛」兑换永久天赋。</div>
      ${ACH.map(([k, n, d, , rw, kind]) => `<div class="perk" style="${M.ach[k] ? 'border-color:#8a6a2a;background:#2a2016' : 'opacity:.62'}"><div class="pi">${M.ach[k] ? '🏅' : '🔒'}</div><div class="pt"><b>${n}</b><small>${d}</small></div><div style="font-size:13px;color:${kind === 'core' ? '#9adfff' : '#e0c8ff'}">${kind === 'core' ? `💠 ${rw}` : `🔮 ${fmt(rw)}+`}</div></div>`).join('')}`,
      a => { if (a === 'close') closeModal(); });
  }
  addEventListener('keydown', e => { if (e.code === 'KeyJ' && (!window.Mods || Mods.on('ach')) && !e.repeat && !modal && window.G && G.playing && !G.uiOpen && !(window.Seance && Seance.active)) openAch(); });

  // =====================================================================
  // 挂钩
  // =====================================================================
  function init() {
    const HK = G.HOOK;
    applyPending();
    const ON = id => !window.Mods || Mods.on(id);
    HK.frame.push((dt) => { if (ON('forge')) tickForge(dt); if (ON('bowling')) tickBowling(dt); if (ON('echo')) tickChat(dt); if (ON('thief')) tickThief(dt); if (ON('rebirth')) tickHand(dt); if (ON('surge')) tickSurge(dt); if (ON('ach')) tickAch(dt);
      for (const b of G.builds) if (b.g.userData.rorb) { const o = b.g.userData.rorb, t = now(); o.position.y = 1.35 + Math.sin(t * 1.3) * 0.04; o.rotation.y = t * 0.5; o.children.forEach((c, i) => { if (i) c.rotation.x += dt * (0.4 + i * 0.3); }); } });
    HK.click.push(() => hitThief());
    HK.e.push((hit, held, pickup) => {
      const b = hit && hit.build; if (!b) return false;
      const d = typeOf(b);
      if (d.forge && !held && !pickup) { fuse(b); return true; }
      if (b.type === 'dresser' && held) { openDresser(held); return true; }
      if (b.type === 'dresser' && !held) { G.toast('先拿起一颗首级，再对着化妆台按 E', '#ffc8dc', 2); return true; }
      if (b.type === 'altar' && !held) { openAltar(); return true; }
      return false;
    });
    HK.tip.push((hit, held) => {
      if (aimThief()) return `<b style="color:#c79aff">👻 盗魂灵</b> · 剩余 ${thief.hp}/${thief.hp0} · <b>左键</b>攻击！`;
      const b = hit && hit.build; if (!b) return null;
      if (b.type === 'forge' && !held && !hit.head) { const P = fusePlan(b); return P ? `<b>⚗️ 熔魂炉</b> · 三颗 → 【${RARN[P.target]}】${P.same ? '（同阶必升）' : `（${Math.round((0.3 + lv('forge') * 0.08) * 100)}% 再升一阶）`} · <b>[E]</b> 开炉 🔮${fmt(P.fee)}` : `<b>⚗️ 熔魂炉</b> · 炉台 ${b.heads.filter(Boolean).length}/3 · 拿着首级按 E 放上炉台`; }
      if (b.type === 'dresser') return held ? `<b>💄 化妆台</b> · <b>[E]</b> 打扮「${NM(held.rec.c)}」` : '<b>💄 化妆台</b> · 先拿起一颗首级';
      if (b.type === 'altar' && !held) return `<b>♻️ 轮回祭坛</b> · 第 ${M.rb || 0} 世 · 魂核 ${M.cores} · <b>[E]</b> 查看`;
      if (b.type === 'bowling') { const L = b.bowl; return `<b>🎳 魂球道</b> · 拿起首级站在金线后<b>右键</b>扔出${L && L.streak ? ` · 当前 ${L.streak} 连全中` : ''}`; }
      return null;
    });
  }
  api.init = init; api.openAch = openAch; api.openAltar = openAltar; api.openDresser = openDresser; api.spawnThief = spawnThief; api.fuse = fuse;
  api._dbg = { get thief() { return thief; }, hitThief: () => { if (!thief) return; thief.hp = 1; thief.hitT = 0; killThief(true); }, chat: () => startChat(), coresFor, rebirth: () => rebirth(), surge: () => { surgeT = 0; } };
  return api;
})();
