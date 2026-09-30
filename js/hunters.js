// 第二十六轮(n)：食人魔猎手（MOD ogre_hunters）
// 你在一个地区闹得越凶（放倒/斩首/停留时间），“追踪热度”越高；满了之后 15 秒倒计时——
// “食人魔猎手正在猎杀你！”——然后把你拖进一片生成的「猎手围场」（本趟地点图里临时加的一个节点，复用当前地貌，开阔布局）。
// 围场的门在猎手全灭前封锁。每次活下来，下一批猎手更多、更硬（G.S.hunt.lv 永久递增）。
// 不改 worlds.js：包装 Worlds.start / Worlds.onKey / Foe.populate，用 Worlds._debug.goto 进场。
window.Hunters = (() => {
  const on = () => !window.Mods || Mods.on('ogre_hunters');
  const G = () => window.__game;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const IDS = ['knight', 'merc', 'dragonslayer', 'crossbow', 'assassin', 'inquisitor', 'guard', 'huntress']; // 都是 foe.js ARMED 里有武器的身份
  const TITLES = ['猎魔人', '赏金猎手', '银箭猎手', '屠魔骑士', '追猎者', '封魔人'];
  const NAMES = ['薇拉', '伊芙', '卡珊', '诺拉', '赛琳', '艾达', '洛蒂', '米拉', '奥莉', '妮娅', '菲兹', '朵拉', '瑟琳', '葛蕾', '珂洛'];
  const COUNT = 15; // 预警倒计时（秒）

  function SS() { const S = G().S; S.hunt = S.hunt || { lv: 0, won: 0 }; return S.hunt; }
  let H = null; // 本趟状态 { heat, t0, warnAt, stage:'calm'|'warn'|'arena'|'won', arena, prev, hunters:[fo], lastT }

  function setup() { H = on() ? { heat: 0, t0: performance.now(), warnAt: 0, stage: 'calm', arena: -1, prev: -1, hunters: [], seen: 0, times: 0, base: 0 } : null; }
  const need = () => 10 + SS().lv * 2 + (H ? H.times * 4 : 0); // 热度阈值（每趟第二次更难触发）
  function heatNow(W) {
    const st = W.stats || {}, min = (performance.now() - H.t0) / 60000;
    return (st.kill || 0) * 1 + (st.decap || 0) * 1.5 + min * 0.8;
  }

  function wrap() {
    if (window.Worlds && !Worlds.__hu) {
      const s0 = Worlds.start; Worlds.start = function () { const r = s0.apply(this, arguments); try { setup(); } catch (e) { console.warn('Hunters setup', e); H = null; } return r; };
      const k0 = Worlds.onKey; Worlds.onKey = function (e) {
        const W = Worlds._W;
        if (H && W && H.stage === 'arena' && W.cur === H.arena && e.code === 'KeyE' && !e.repeat && W.doorNear && H.hunters.some(f => !f.dead)) { G().toast && G().toast('🔒 围场被猎手封死了——先解决她们！', '#ff9070', 1.8); return true; }
        return k0.apply(this, arguments);
      };
      Worlds.__hu = 1;
    }
    if (window.Foe && !Foe.__hu) {
      const p0 = Foe.populate;
      Foe.populate = async function (ctx, list) {
        const out = await p0.apply(this, arguments);
        try {
          const W = window.Worlds && Worlds._W, node = W && W.graph && W.graph.nodes[W.cur];
          if (H && node && node.huntArena && out) {
            const lv = SS().lv; H.hunters = out.filter(f => f.h && f.h.hunter);
            for (const fo of H.hunters) { fo.maxHp = fo.hp = 70 + lv * 14; fo.iq = Math.min(1.25, 0.8 + lv * 0.06); fo.brave = true; fo.seen = true; fo.state = 'chase'; fo.cd = 1.2 + Math.random() * 1.5; }
          }
        } catch (e) { console.warn('Hunters boost', e); }
        return out;
      };
      Foe.__hu = 1;
    }
  }

  function makeHunters(loc, n) {
    const g = G(), out = [];
    for (let i = 0; i < n; i++) {
      if (!window.RPG || !RPG.foe) break;
      const h = RPG.foe(g.S, loc, (Math.random() * 4294967296) >>> 0, g.usedNames, g.usedSig), id = IDS[(i + SS().lv) % IDS.length];
      const title = TITLES[Math.floor(Math.random() * TITLES.length)], nm = NAMES[Math.floor(Math.random() * NAMES.length)];
      Object.assign(h.c, { id, idN: title, title, name: nm, rar: Math.min(4, 2 + Math.floor((SS().lv + i) / 3)) }); h.hunter = 1;
      h.story = `受雇追猎食人魔的${title}。她的悬赏单上写着你的样子。`;
      out.push(h);
    }
    return out;
  }
  async function toArena() {
    const W = Worlds._W; if (!W || !Worlds._debug || !Worlds._debug.goto) return;
    const g = W.graph, cur = g.nodes[W.cur], lv = SS().lv, n = Math.min(7, 2 + lv);
    const node = { i: g.nodes.length, x: Math.min(148, cur.x + 12), y: Math.max(4, cur.y - 10), region: cur.region, loc: cur.loc, style: cur.style, size: 'm', R: 24, name: '猎手围场', seed: (Math.random() * 4294967296) >>> 0,
      adj: [W.cur], depth: cur.depth, visited: false, known: true, home: false, stone: false, boss: false, lay: 'plain', huntArena: 1 };
    node.prey = makeHunters(cur.loc, n); node.chests = [{ coin: Math.round((cur.loc.rec || 100) * (2 + lv * 0.5)), potion: true }]; node.loot = [];
    g.nodes.push(node); H.arena = node.i; H.prev = W.cur; H.stage = 'arena'; H.hunters = [];
    try { SFX.roar && SFX.roar(0.9); } catch (e) {}
    await Worlds._debug.goto(node.i);
    setTimeout(() => banner('猎手围场', `${n} 名食人魔猎手围住了你`, `第 ${lv + 1} 批 · 打倒她们，门才会打开`), 600);
  }

  // ================= HUD =================
  let hud = null;
  function ensureHud() {
    if (hud) return hud;
    const s = document.createElement('style'); s.textContent = `
#huHud{position:fixed;inset:0;pointer-events:none;z-index:34;display:none;font-family:inherit}
#huHeat{position:absolute;left:14px;top:196px;width:200px;font-size:11.5px;color:#e8c8b8;text-shadow:0 1px 3px #000;letter-spacing:1px}
#huHeat .b{height:4px;margin-top:3px;background:#0008;border-radius:2px;overflow:hidden}#huHeat i{display:block;height:100%;width:0;background:linear-gradient(90deg,#a04020,#ff5030);transition:width .3s}
#huWarn{position:absolute;top:21%;left:50%;transform:translateX(-50%);text-align:center;display:none;color:#fff}
#huWarn .a{font-size:30px;font-weight:900;letter-spacing:4px;color:#ff5a40;text-shadow:0 0 18px #ff200088,0 2px 8px #000;animation:huP 1s ease-in-out infinite}
#huWarn .c{font-size:15px;color:#ffd0c0;margin-top:4px;text-shadow:0 1px 4px #000}#huWarn .c b{font-size:22px;color:#fff}
@keyframes huP{0%,100%{opacity:1}50%{opacity:.62}}
#huVig{position:absolute;inset:0;box-shadow:inset 0 0 160px #ff200000;transition:box-shadow .4s}
#huBan{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);opacity:0;transition:opacity .5s;text-align:center;color:#fff;text-shadow:0 2px 12px #000;padding:14px 34px;background:radial-gradient(ellipse at center,#1a0806e8 30%,#1a080600 72%)}
#huBan.on{opacity:1}#huBan .a{font-size:12px;letter-spacing:6px;color:#ff8a70}#huBan .b{font-size:26px;font-weight:900;margin:4px 0}#huBan .c{font-size:13.5px;color:#f0d8c8}
#huLeft{position:absolute;top:64px;right:16px;color:#ffb0a0;font-weight:800;font-size:14px;text-shadow:0 1px 4px #000;display:none}`;
    document.head.appendChild(s);
    const d = document.createElement('div'); d.id = 'huHud'; d.innerHTML = '<div id="huVig"></div><div id="huHeat">🔥 猎手追踪<div class="b"><i></i></div></div><div id="huWarn"><div class="a">食人魔猎手正在猎杀你！</div><div class="c"></div></div><div id="huLeft"></div><div id="huBan"></div>';
    document.body.appendChild(d);
    hud = { root: d, heat: d.querySelector('#huHeat'), heatI: d.querySelector('#huHeat i'), warn: d.querySelector('#huWarn'), warnC: d.querySelector('#huWarn .c'), vig: d.querySelector('#huVig'), left: d.querySelector('#huLeft'), ban: d.querySelector('#huBan') };
    return hud;
  }
  function banner(a, b, c) { const h = ensureHud(); h.ban.innerHTML = `<div class="a">${esc(a)}</div><div class="b">${esc(b)}</div><div class="c">${esc(c)}</div>`; h.ban.classList.add('on'); clearTimeout(h._t); h._t = setTimeout(() => h.ban.classList.remove('on'), 4200); }

  function tick() {
    const W = window.Worlds && Worlds.active && Worlds._W;
    if (!W || !H || !on() || !W.graph || !W.graph.trip) { if (hud) hud.root.style.display = 'none'; if (!W) H = null; return; }
    const h = ensureHud(); h.root.style.display = 'block';
    const now = performance.now();
    if (H.stage === 'calm') {
      const cur = W.graph.nodes[W.cur], bossFight = W.boss && !W.boss.dead;
      if (!cur || cur.home) H.t0 += 150; // 在洞口节点不涨时间热度
      H.heat = heatNow(W) - H.base; const f = Math.min(1, H.heat / need());
      h.heat.style.display = 'block'; h.heatI.style.width = (f * 100) + '%'; h.vig.style.boxShadow = 'inset 0 0 160px #ff200000'; h.warn.style.display = 'none'; h.left.style.display = 'none';
      if (f >= 1 && !W.busy && !W.dead && !bossFight) { H.stage = 'warn'; H.warnAt = now; try { SFX.roar && SFX.roar(0.5); } catch (e) {} }
    } else if (H.stage === 'warn') {
      const left = Math.max(0, COUNT - (now - H.warnAt) / 1000);
      h.heat.style.display = 'none'; h.warn.style.display = 'block'; h.warnC.innerHTML = `<b>${Math.ceil(left)}</b> 秒后被拖进猎手围场 · 第 ${SS().lv + 1} 批 · 先喝药、捡好首级`;
      h.vig.style.boxShadow = `inset 0 0 ${120 + 60 * Math.sin(now / 160)}px #ff2000${left < 5 ? '88' : '44'}`;
      if (left <= 0 && !W.busy && !W.dead && !(W.boss && !W.boss.dead)) { h.warn.style.display = 'none'; h.vig.style.boxShadow = 'inset 0 0 160px #ff200000'; toArena().catch(e => { console.warn('Hunters arena', e); H.stage = 'calm'; H.t0 = now; H.base = heatNow(W); }); }
    } else if (H.stage === 'arena') {
      h.heat.style.display = 'none'; h.warn.style.display = 'none';
      if (W.cur === H.arena && H.hunters.length) {
        const alive = H.hunters.filter(f => !f.dead).length; h.left.style.display = 'block'; h.left.textContent = `🏹 猎手 剩余 ${alive}/${H.hunters.length}`;
        if (!alive) {
          const S = SS(); S.lv++; S.won++; H.stage = 'calm'; H.times++; H.t0 = now; H.base = heatNow(W); h.left.style.display = 'none';
          const L = W.graph.nodes[H.arena].loc, c = Math.round((L.rec || 100) * (3 + S.lv)); G().addCoins && G().addCoins(c); if (W.trip) W.trip.coins += c;
          const Rg = window.RegEcon && RegEcon.BY && RegEcon.BY[L.k]; let extra = '';
          if (Rg && window.Sack && Sack.stashAdd) { try { Sack.stashAdd(Sack.mk(Rg.r[0], 1)); extra = ` · ${Rg.r[2]}${Rg.r[1]}×1`; } catch (e) {} }
          try { G().save && G().save(); } catch (e) {}
          banner('猎手全灭', '围场的门开了', `+${c}🔮${extra} · 下一批猎手会更强（第 ${S.lv + 1} 批）`);
        }
      } else if (W.cur !== H.arena && !W.busy) { H.stage = 'calm'; H.t0 = now; H.base = heatNow(W); }
    }
  }

  wrap(); setTimeout(wrap, 0); window.addEventListener('load', wrap);
  setInterval(() => { try { tick(); } catch (e) { console.warn('Hunters tick', e); } }, 150);
  return { on, get H() { return H; }, SS, _setup: setup, _tick: tick, toArena, makeHunters };
})();
