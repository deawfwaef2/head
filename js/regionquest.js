// 第二十六轮(m)：地区档案 + 选地图卡片 + 到达简介/任务/奖励 + 小BOSS（MOD region_quest / region_pick）
// - 选地点：左侧预览图条（js/regionart.js），右侧档案：霸主(大BOSS)、两名小BOSS、居民、特产、任务预览、出发
// - 到达：非阻塞简介卡（8 秒自动消失）+ 左侧任务追踪；完成给魂晶 + 地区材料
// - 小BOSS：每个地区两名有名有姓的精英（普通敌人强化，不走霸主流程），讨伐后永久记录 ☠，掉地区材料
// 不改 worlds.js：包装 Worlds.start 与 Foe.populate，轮询 Worlds._W（W.stats 的 kill/decap 计数）
window.RegionQuest = (() => {
  const on = () => !window.Mods || Mods.on('region_quest');
  const pickOn = () => on() && (!window.Mods || Mods.on('region_pick'));
  const G = () => window.__game;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LOC = k => Lore.LOCS.find(l => l.k === k);
  const BOSS = k => window.Explore && Explore.BOSSES[k];

  // ================= 地区档案 =================
  const DATA = {
    village: { tag: '新手猎场 · 麦田与炊烟', arrive: '麦田边的稻草人歪着脑袋看你。村口的狗还没来得及叫，就把尾巴夹了起来。', why: '洞里的魂火饿了，雾溪村的首级最新鲜。',
      minis: [{ n: '莉娜', title: '守夜女猎户', id: 'huntress', desc: '提着斧头在麦田边巡夜，一个人赶走过三头狼。' },
              { n: '玛尔塔', title: '铁匠之女', id: 'smithgirl', desc: '抡锤的胳膊比你的还粗，发誓要打一副食人魔脚镣。' }] },
    forest: { tag: '月光树城 · 古木参天', arrive: '萤火虫在你鼻尖前停了一瞬，然后整片林子的歌声同时断了。', why: '精灵的首级带着月光，挂在洞里整夜发亮。',
      minis: [{ n: '艾洛薇', title: '月影游侠', id: 'ranger', desc: '在树冠间来去无声，箭从来不射第二次。' },
              { n: '菲奥娜', title: '橡心德鲁伊', id: 'druid', desc: '能让藤蔓替她拦路，脾气比千年橡树还倔。' }] },
    wilds: { tag: '风沙部落 · 图腾与战鼓', arrive: '风把沙子吹进你的獠牙缝。远处的战鼓顿了一拍，又敲得更响了。', why: '荒原的勇士不求饶——她们的首级最有分量。',
      minis: [{ n: '塔莎', title: '狼牙先锋', id: 'wolfwarrior', desc: '部落冲锋永远第一个，斧刃上刻着十二道战痕。' },
              { n: '绯雪', title: '狐火巫女', id: 'foxmiko', desc: '九条红绳系着铃铛，一摇就有狐火绕着她转。' }] },
    abbey: { tag: '圣光禁地 · 钟声与彩窗', arrive: '晚祷的钟声在你踏进门槛时走了调。彩窗上的圣骑士好像动了一下。', why: '修道院的圣女们把你画在墙上当恶魔——去给她们一个真的。',
      minis: [{ n: '维罗妮卡', title: '铁锤审判官', id: 'inquisitor', desc: '审判书上已经写好了你的名字，只差一锤。' },
              { n: '奥黛丽', title: '圣盾骑士', id: 'paladin', desc: '盾上的圣徽被砍出过七道裂口，从没退过一步。' }] },
    swamp: { tag: '毒雾泽国 · 鬼火与大锅', arrive: '沼泽冒出一个大泡，破掉时发出一声叹息。鬼火们朝你这边挪了挪。', why: '魔女们在熬汤，缺一味食人魔——先去收了她们的锅。',
      minis: [{ n: '蕾温', title: '毒雾诅咒师', id: 'hexer', desc: '手里的布偶缝着你的样子，针还没扎下去。' },
              { n: '卡米拉', title: '夜宴伯爵夫人', id: 'countess', desc: '三百岁生日宴会还没散场，她嫌你来得太迟。' }] },
    fortress: { tag: '边境铁壁 · 号角与城墙', arrive: '城头的号角吹到一半破了音。弩机转过来，一排排对准了你。', why: '要塞的女骑士号称从未失守——让她们第一次失守。',
      minis: [{ n: '希尔达', title: '断城佣兵长', id: 'merc', desc: '拿双倍佣金，砍过的攻城锤比你见过的树还多。' },
              { n: '格温', title: '百步弩手', id: 'crossbow', desc: '百步之外射穿过苹果，也射穿过上一头食人魔的眼。' }] },
    capital: { tag: '金冠之城 · 舞会与暗巷', arrive: '舞会的乐声从宫殿飘出来，街角的鸽子一齐飞起。今晚的客人是你。', why: '王都的贵族首级最精致，魂晶也最贵。',
      minis: [{ n: '夜莺', title: '皇家刺客', id: 'assassin', desc: '王都暗巷里的传说，见过她脸的人都没再开口。' },
              { n: '艾格尼丝', title: '金甲近卫长', id: 'guard', desc: '女王寝宫外站了十年岗，今晚想换个地方站。' }] },
    abyss: { tag: '大地伤口 · 熔岩与骸骨桥', arrive: '硫磺热风扑在脸上。裂隙深处有什么东西在笑，笑声停在了你身后。', why: '深渊的魔族首级是最烈的魂火燃料。',
      minis: [{ n: '娜塔莎', title: '影刃', id: 'shadow', desc: '藏在你的影子里跟了三条街，才决定动手。' },
              { n: '露西恩', title: '折翼堕天使', id: 'fallen', desc: '剩下的那只翅膀还在滴着圣光，剑却是黑的。' }] },
    peak: { tag: '神话之巅 · 云海与龙骨', arrive: '你翻过一根城墙那么粗的古龙肋骨。云海翻涌，山顶的神殿亮得刺眼。', why: '圣山之上只有传说——把传说的首级带回洞里。',
      minis: [{ n: '西格丽德', title: '屠龙者', id: 'dragonslayer', desc: '腰上挂着三枚龙牙，还差一枚食人魔的獠牙。' },
              { n: '天音', title: '龙之巫女', id: 'dragonmiko', desc: '唱一句祷词，山风就停下来替她听。' }] }
  };

  // ================= 存档 =================
  function SS() { const S = G().S; S.rq = S.rq || { minis: {}, done: 0, last: null }; S.rq.minis = S.rq.minis || {}; return S.rq; }
  const miniDead = m => !!SS().minis[m.n];
  const aliveMinis = k => (DATA[k] ? DATA[k].minis : []).filter(m => !miniDead(m));

  // ================= 任务 =================
  const pending = {}; // k -> 在选地点界面预览过的任务（出发时照这个给）
  function roll(k) {
    const L = LOC(k), B = BOSS(k), S = G().S, pool = [], am = aliveMinis(k), r = Math.random;
    am.forEach(m => pool.push({ kind: 'mini', m: m.n, w: 2 }));
    pool.push({ kind: 'decap', n: 2 + Math.floor(r() * 3), w: 2 }, { kind: 'kill', n: 3 + Math.floor(r() * 3), w: 1.5 });
    if (B && !(S.bosses || {})[k]) pool.push({ kind: 'boss', w: 1 });
    let t = r() * pool.reduce((a, b) => a + b.w, 0), q = pool[0]; for (const p of pool) { t -= p.w; if (t <= 0) { q = p; break; } }
    const Rg = window.RegEcon && RegEcon.BY && RegEcon.BY[k];
    q.coin = Math.round(L.rec * (q.kind === 'boss' ? 6 : q.kind === 'mini' ? 4 : 2.5));
    q.mats = Rg ? [[Rg.c[0], q.kind === 'boss' ? 5 : 3], [Rg.r[0], q.kind === 'kill' ? 0 : 1]].filter(x => x[1] > 0) : [];
    q.k = k; return q;
  }
  function peek(k) { if (!pending[k] || (pending[k].kind === 'mini' && miniDead({ n: pending[k].m })) || (pending[k].kind === 'boss' && (G().S.bosses || {})[k])) pending[k] = roll(k); return pending[k]; }
  function mText(q) {
    const B = BOSS(q.k), m = q.m && DATA[q.k].minis.find(x => x.n === q.m), L = LOC(q.k);
    return q.kind === 'mini' ? `讨伐小BOSS「${m.title}·${m.n}」` : q.kind === 'boss' ? `讨伐霸主「${B.title}·${B.n}」` : q.kind === 'decap' ? `斩下 ${q.n} 颗${L.n}的首级` : `放倒 ${q.n} 名${L.n}的守卫`;
  }
  const matName = id => {
    const R = window.RegEcon && RegEcon.REG; if (R) for (const g of R) { if (g.c[0] === id) return g.c[2] + g.c[1]; if (g.r[0] === id) return g.r[2] + g.r[1]; }
    try { if (window.RegEcon && RegEcon.nm) return RegEcon.nm(id); } catch (e) {} return id;
  };
  const rText = q => `🔮${q.coin}` + q.mats.map(([id, n]) => ` · ${matName(id)}×${n}`).join('');
  function prog(q) {
    const W = window.Worlds && Worlds._W, st = (W && W.stats) || {};
    if (q.kind === 'mini') return [miniDead({ n: q.m }) ? 1 : 0, 1];
    if (q.kind === 'boss') return [(G().S.bosses || {})[q.k] ? 1 : 0, 1];
    if (q.kind === 'decap') return [Math.min(q.n, st.decap || 0), q.n];
    return [Math.min(q.n, (st.kill || 0)), q.n];
  }
  function give(q, why) {
    const g = G(); if (q.coin) { g.addCoins && g.addCoins(q.coin); const W = Worlds._W; if (W && W.trip) W.trip.coins += q.coin; }
    const got = [];
    if (window.Sack && Sack.stashAdd && Sack.mk) for (const [id, n] of q.mats) { try { Sack.stashAdd(Sack.mk(id, n)); got.push(matName(id) + '×' + n); } catch (e) { console.warn('RQ give', e); } }
    try { window.SFX && (SFX.play ? SFX.play('coins') : SFX.coins && SFX.coins()); } catch (e) {}
    try { g.save && g.save(); } catch (e) {}
    return `🔮${q.coin}${got.length ? ' · ' + got.join(' · ') : ''}（已放进储藏）`;
  }

  // ================= 出猎：包装 =================
  let T = null; // 本趟状态 { k, q, done, shown, minis:[{m, node, fo, dead}] }
  function setupTrip(trip) {
    if (!on()) { T = null; return; }
    const W = Worlds._W; if (!W || !W.graph || !W.graph.trip) { T = null; return; }
    const k = trip.loc.k, q = peek(k); delete pending[k];
    const g = W.graph, cand = g.nodes.filter(n => !n.home && !n.boss && n.depth >= 1).sort((a, b) => a.depth - b.depth);
    const am = aliveMinis(k), minis = [];
    am.forEach((m, i) => { if (!cand.length) return; const at = Math.min(cand.length - 1, Math.floor(cand.length * (i === 0 ? 0.45 : 0.85))); const node = cand.splice(at, 1)[0]; node.rqMini = m; minis.push({ m, node, fo: null, dead: false }); });
    T = { k, q, done: false, shown: false, minis, t0: performance.now() };
    SS().last = k;
  }
  function wrap() {
    if (window.Worlds && !Worlds.__rq) { const s0 = Worlds.start; Worlds.start = function (trip, api) { const r = s0.apply(this, arguments); try { setupTrip(trip); } catch (e) { console.warn('RQ setup', e); T = null; } return r; }; Worlds.__rq = 1; }
    if (window.Foe && !Foe.__rq) {
      const p0 = Foe.populate; let injH = null;
      Foe.populate = async function (ctx, list) {
        injH = null;
        try {
          const W = window.Worlds && Worlds._W, node = W && W.graph && W.graph.nodes[W.cur], m = on() && T && node && node.rqMini;
          if (m && !miniDead(m) && window.RPG && RPG.foe) {
            const g = G(), h = node.rqH || (node.rqH = RPG.foe(g.S, node.loc, (Math.random() * 4294967296) >>> 0, g.usedNames, g.usedSig));
            Object.assign(h.c, { name: m.n, id: m.id, idN: (Lore.ID[m.id] || {}).n || m.title, title: m.title, rar: 3 }); h.story = m.desc; h.rqMini = m.n;
            const B = W.B; let x = 0, z = 0; if (B) for (let t = 0; t < 40; t++) { const a = Math.random() * 6.28, d = B.R * (0.2 + Math.random() * 0.35); x = Math.cos(a) * d; z = Math.sin(a) * d; if (!B.cols || B.cols.every(c => Math.hypot(c.x - x, c.z - z) > c.r + 1)) break; }
            list = list.concat([{ h, pos: new THREE.Vector3(x, 0, z) }]); injH = h;
          }
        } catch (e) { console.warn('RQ mini', e); }
        const out = await p0.call(this, ctx, list);
        try {
          if (injH && out) { const fo = out.find(f => f.h === injH); if (fo) { fo.maxHp = fo.hp = 100; fo.iq = Math.max(fo.iq, 0.92); fo.brave = true; fo.rqMini = injH.rqMini; const e = T && T.minis.find(x => x.m.n === injH.rqMini); if (e) e.fo = fo; } }
        } catch (e) { console.warn('RQ boost', e); }
        return out;
      };
      Foe.__rq = 1;
    }
  }

  // ================= HUD =================
  let hud = null;
  function css() {
    if (document.getElementById('rqCss')) return;
    const s = document.createElement('style'); s.id = 'rqCss'; s.textContent = `
#rqHud{position:fixed;inset:0;pointer-events:none;z-index:34;font-family:inherit;display:none}
#rqTrack{position:absolute;left:14px;top:132px;max-width:300px;color:#f3e6cf;font-size:13px;line-height:1.5;background:linear-gradient(90deg,#120c08cc,#120c0800);padding:6px 16px 6px 10px;border-left:3px solid #c99a4f;text-shadow:0 1px 3px #000}
#rqTrack b{color:#ffd88a}#rqTrack .ok{color:#8fe080}#rqTrack small{color:#bda88a}
#rqCard{position:absolute;top:17%;left:50%;transform:translate(-50%,-8px);width:min(540px,86vw);opacity:0;transition:opacity .6s,transform .6s;color:#eadcc7;text-align:center;
  background:linear-gradient(180deg,#140e0ae8,#0a0706f0);border:1px solid #c99a4f88;border-radius:3px;box-shadow:0 18px 60px #000a;overflow:hidden}
#rqCard.on{opacity:1;transform:translate(-50%,0)}
#rqCard .im{height:92px;background-size:cover;background-position:center;position:relative}
#rqCard .im:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,#140e0a)}
#rqCard .nm{margin-top:-38px;position:relative;font-size:24px;font-weight:900;letter-spacing:3px;color:#fff;text-shadow:0 2px 10px #000}
#rqCard .tg{font-size:11px;letter-spacing:4px;color:#c99a4f;margin:2px 0 8px}
#rqCard .ar{font-size:14px;line-height:1.65;padding:0 22px;color:#e8dcc8}
#rqCard .ms{margin:12px 18px 16px;padding:9px 12px;border:1px dashed #c99a4f77;background:#00000040;font-size:13.5px}
#rqCard .ms b{color:#ffd88a}#rqCard .ms small{display:block;color:#bda88a;margin-top:3px}
#rqMini{position:absolute;top:64px;left:50%;transform:translateX(-50%);width:min(380px,70vw);display:none;text-align:center;color:#fff;font-weight:800;font-size:13px;text-shadow:0 1px 4px #000}
#rqMini .bar{height:7px;margin-top:4px;background:#0009;border:1px solid #c070ff88;border-radius:2px;overflow:hidden}#rqMini i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#8a3ad0,#e080ff);transition:width .2s}
#rqMini em{font-style:normal;color:#d8a0ff;font-size:11px;letter-spacing:2px;margin-right:6px}
#rqDone{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%) scale(.96);opacity:0;transition:opacity .5s,transform .5s;text-align:center;color:#fff;text-shadow:0 2px 12px #000;padding:14px 34px;background:radial-gradient(ellipse at center,#140c08e8 30%,#140c0800 72%)}
#rqDone.on{opacity:1;transform:translate(-50%,-50%) scale(1)}#rqDone .a{font-size:12px;letter-spacing:6px;color:#ffd88a}#rqDone .b{font-size:26px;font-weight:900;margin:4px 0}#rqDone .c{font-size:13.5px;color:#e8dcc8}
/* 选地点 */
.rq-pick{display:grid;grid-template-columns:238px 1fr;gap:14px;margin-top:8px;min-height:0}
.rq-list{display:flex;flex-direction:column;gap:6px;max-height:min(70vh,700px);overflow:auto;padding-right:4px}
.rq-it{position:relative;height:58px;flex:none;border-radius:3px;overflow:hidden;cursor:pointer;background-size:cover;background-position:center;border:1px solid #ffffff18;transition:transform .12s,border-color .12s,filter .12s;filter:saturate(.75) brightness(.8)}
.rq-it:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#0a0706ee 20%,#0a070660 70%,transparent)}
.rq-it:hover{filter:none;transform:translateX(2px)}.rq-it.on{filter:none;border-color:var(--lc);box-shadow:inset 3px 0 0 var(--lc),0 0 16px color-mix(in srgb,var(--lc) 35%,transparent)}
.rq-it .t{position:absolute;left:10px;top:7px;right:8px;color:#fff;font-weight:800;font-size:15px;text-shadow:0 1px 4px #000;white-space:nowrap}
.rq-it .d{position:absolute;left:10px;bottom:6px;font-size:11.5px;font-weight:700;text-shadow:0 1px 3px #000}
.rq-it .cr{position:absolute;right:8px;bottom:5px;font-size:13px}
.rq-det{min-width:0;max-height:min(70vh,700px);overflow:auto;padding-right:4px}
.rq-hero{position:relative;aspect-ratio:3.3/1;border-radius:3px;background-size:cover;background-position:center;overflow:hidden;border:1px solid color-mix(in srgb,var(--lc) 45%,#000)}
.rq-hero:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,#0b0806f2)}
.rq-hero .x{position:absolute;left:16px;bottom:12px;right:16px;z-index:1}
.rq-hero .n{font-size:30px;font-weight:900;color:#fff;letter-spacing:3px;text-shadow:0 2px 12px #000}.rq-hero .g{font-size:12px;letter-spacing:4px;color:var(--lc);filter:brightness(1.35);text-shadow:0 1px 3px #000}
.rq-hero .chips{position:absolute;right:12px;top:10px;z-index:1;display:flex;gap:6px}
.rq-chip{font-size:12px;font-weight:800;padding:3px 9px;border-radius:2px;background:#000a;border:1px solid currentColor}
.rq-desc{margin:10px 2px 4px;color:#d8cab4;font-size:13.5px}
.rq-sec{margin-top:12px}.rq-sec>h4{margin:0 0 6px;font-size:12px;letter-spacing:3px;color:#c99a4f;font-weight:800}
.rq-boss{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border:1px solid color-mix(in srgb,var(--bc) 55%,#000);background:linear-gradient(120deg,color-mix(in srgb,var(--bc) 16%,#0c0806),#0c0806 70%);border-radius:3px}
.rq-boss .ic{font-size:28px;line-height:1}.rq-boss .bn{font-weight:900;font-size:16px;color:#fff}.rq-boss .bt{color:var(--bc);font-size:12px;font-weight:800;letter-spacing:2px}.rq-boss p{margin:4px 0 0;font-size:12.5px;color:#cbbba3;line-height:1.55}
.rq-boss .st{margin-left:auto;font-size:12px;font-weight:800;white-space:nowrap}
.rq-minis{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rq-mini{padding:8px 10px;border:1px solid #9a5ad055;background:#150c1a88;border-radius:3px;font-size:12.5px;color:#cbbba3}.rq-mini b{color:#fff;font-size:14px}.rq-mini .mt{color:#d8a0ff;font-size:11.5px;font-weight:800}.rq-mini.dead{opacity:.5;filter:grayscale(.6)}
.rq-tags{display:flex;flex-wrap:wrap;gap:5px}.rq-tag{font-size:12px;padding:2px 8px;border-radius:2px;background:#ffffff0d;border:1px solid #ffffff1a;color:#dccfb9}.rq-tag.rare{border-color:#ffb03066;color:#ffd88a}
.rq-mis{padding:9px 12px;border:1px dashed #c99a4f77;background:#00000030;font-size:13.5px;color:#eadcc7}.rq-mis b{color:#ffd88a}.rq-mis small{display:block;color:#bda88a;margin-top:3px}
.rq-go{position:sticky;bottom:0;margin-top:14px;width:100%;padding:13px;font-size:17px;font-weight:900;letter-spacing:4px;cursor:pointer;color:#1a0f08;border:0;border-radius:3px;background:linear-gradient(180deg,color-mix(in srgb,var(--lc) 60%,#ffe0a0),color-mix(in srgb,var(--lc) 75%,#6a4020));box-shadow:0 6px 24px #0008}
.rq-go:hover{filter:brightness(1.12)}
@media (max-width:760px){.rq-pick{grid-template-columns:1fr}.rq-list{flex-direction:row;overflow-x:auto;max-height:none}.rq-it{width:150px}.rq-minis{grid-template-columns:1fr}}
`; document.head.appendChild(s);
  }
  function ensureHud() {
    if (hud) return hud; css();
    const d = document.createElement('div'); d.id = 'rqHud';
    d.innerHTML = '<div id="rqTrack"></div><div id="rqCard"></div><div id="rqMini"><div class="n"></div><div class="bar"><i></i></div></div><div id="rqDone"></div>';
    document.body.appendChild(d);
    hud = { root: d, track: d.querySelector('#rqTrack'), card: d.querySelector('#rqCard'), mini: d.querySelector('#rqMini'), miniN: d.querySelector('#rqMini .n'), miniI: d.querySelector('#rqMini i'), done: d.querySelector('#rqDone') };
    return hud;
  }
  function showCard() {
    const h = ensureHud(), L = LOC(T.k), D = DATA[T.k], img = window.RegionArt && RegionArt[T.k];
    const mn = T.minis.map(x => `${x.m.title}·${x.m.n}`).join('、');
    h.card.innerHTML = `${img ? `<div class="im" style="background-image:url(${img})"></div>` : '<div style="height:46px"></div>'}<div class="nm">${L.icon} ${esc(L.n)}</div><div class="tg">${esc(D.tag)}</div>
      <div class="ar">${esc(D.arrive)}</div><div class="ms">📜 <b>${esc(mText(T.q))}</b><small>${esc(D.why)} · 奖励 ${rText(T.q)}</small>${mn ? `<small>⚔️ 小BOSS 在这片区域游荡：${esc(mn)}</small>` : ''}</div>`;
    requestAnimationFrame(() => h.card.classList.add('on'));
    clearTimeout(h._ct); h._ct = setTimeout(() => h.card.classList.remove('on'), 8500);
  }
  function banner(a, b, c) {
    const h = ensureHud(); h.card.classList.remove('on'); h.done.innerHTML = `<div class="a">${a}</div><div class="b">${b}</div><div class="c">${c}</div>`; h.done.classList.add('on');
    clearTimeout(h._dt); h._dt = setTimeout(() => h.done.classList.remove('on'), 4200);
  }
  function tick() {
    const W = window.Worlds && Worlds.active && Worlds._W;
    if (!W || !T || !on()) { if (hud) hud.root.style.display = 'none'; if (!W) T = null; return; }
    const h = ensureHud(); h.root.style.display = 'block';
    if (!T.shown && !W.busy && W.B) { T.shown = true; setTimeout(() => T && showCard(), 500); }
    // 小BOSS
    let near = null, nd = 1e9;
    for (const x of T.minis) {
      const fo = x.fo; if (!fo) continue;
      if ((fo.dead || fo.hp <= 0) && !x.dead) {
        x.dead = true; SS().minis[x.m.n] = 1; const Rg = window.RegEcon && RegEcon.BY && RegEcon.BY[T.k];
        const got = give({ coin: Math.round(LOC(T.k).rec * 1.5), mats: Rg ? [[Rg.c[0], 2]] : [] });
        banner('小BOSS 讨伐', `${esc(x.m.title)} · ${esc(x.m.n)}`, got);
      }
      if (!x.dead && fo.seen && W.pos && fo.pos) { const d = fo.pos.distanceTo(W.pos); if (d < 22 && d < nd) { nd = d; near = x; } }
    }
    if (near) {
      h.mini.style.display = 'block'; h.mini.style.top = (W.dom && W.dom.boss && W.dom.boss.style.display === 'block') ? '112px' : '64px';
      h.miniN.innerHTML = `<em>小BOSS</em>${esc(near.m.title)} · ${esc(near.m.n)}`; h.miniI.style.width = Math.max(0, near.fo.hp / near.fo.maxHp * 100) + '%';
    } else h.mini.style.display = 'none';
    // 任务
    const [a, b] = prog(T.q);
    if (!T.done && a >= b) { T.done = true; SS().done = (SS().done || 0) + 1; const got = give(T.q); setTimeout(() => banner('任务完成', esc(mText(T.q)), got), T.minis.some(x => x.dead && x.m.n === T.q.m) ? 4400 : 300); }
    const alive = T.minis.filter(x => !x.dead).length;
    h.track.innerHTML = `📜 <b>${esc(mText(T.q))}</b> ${T.done ? '<span class="ok">✓ 完成</span>' : `<span>${a}/${b}</span>`}<br><small>奖励 ${rText(T.q)}${alive ? ` · ⚔️ 小BOSS ×${alive}` : ''}</small>`;
  }

  // ================= 选地点界面 =================
  let sel = null, ctxP = null;
  function dangerOf(l) { const q = ctxP.power / l.rec; return ctxP.danger(q); }
  function itemHTML(l) {
    const [dn, dc] = dangerOf(l), img = window.RegionArt && RegionArt[l.k], won = (G().S.bosses || {})[l.k];
    return `<div class="rq-it${l.k === sel ? ' on' : ''}" data-rq="${l.k}" style="--lc:${l.color};${img ? `background-image:url(${img})` : `background:${l.color}`}"><div class="t">${l.icon} ${esc(l.n)}</div><div class="d" style="color:${dc}">${dn} · ${l.rec}</div>${won ? '<div class="cr" title="已征服">👑</div>' : ''}</div>`;
  }
  function detHTML(k) {
    const l = LOC(k), D = DATA[k] || { tag: '', minis: [], why: '' }, B = BOSS(k), S = G().S, [dn, dc] = dangerOf(l), img = window.RegionArt && RegionArt[k];
    const won = B && (S.bosses || {})[k], R = B && (Lore.RACES[B.race] || { n: '' });
    const bossH = B ? `<div class="rq-sec"><h4>👑 霸主 · 大BOSS</h4><div class="rq-boss" style="--bc:${B.col || '#ffd060'}"><div class="ic">👑</div><div style="min-width:0"><div class="bt">${esc(B.title)} · ${esc(R.n)}</div><div class="bn">${esc(B.n)}</div><p>${esc(B.story)}</p></div><div class="st" style="color:${won ? '#ffd060' : '#e08080'}">${won ? '✓ 已征服' : '在最深处等你'}</div></div></div>` : '';
    const minis = D.minis.length ? `<div class="rq-sec"><h4>⚔️ 小BOSS</h4><div class="rq-minis">${D.minis.map(m => { const dd = miniDead(m); return `<div class="rq-mini${dd ? ' dead' : ''}"><div class="mt">${esc(m.title)}${dd ? ' · ☠ 已讨伐' : ''}</div><b>${esc(m.n)}</b><div>${esc(m.desc)}</div></div>`; }).join('')}</div></div>` : '';
    const ids = Object.entries(l.ids).sort((a, b) => b[1] - a[1]), tot = ids.reduce((a, b) => a + b[1], 0);
    const ppl = `<div class="rq-sec"><h4>👥 居民</h4><div class="rq-tags">${ids.map(([id, w]) => `<span class="rq-tag${w / tot < 0.06 ? ' rare' : ''}">${esc((Lore.ID[id] || { n: id }).n)}${w / tot < 0.06 ? ' ✦' : ''}</span>`).join('')}</div>
      <div class="rq-tags" style="margin-top:5px">${Object.entries(l.races).sort((a, b) => b[1] - a[1]).map(([r, w]) => `<span class="rq-tag" style="opacity:.8">${esc((Lore.RACES[r] || { n: r }).n)} ${w}%</span>`).join('')}</div></div>`;
    const Rg = window.RegEcon && RegEcon.BY && RegEcon.BY[k];
    const mats = `<div class="rq-sec"><h4>🎒 特产</h4><div class="rq-tags">${Rg ? `<span class="rq-tag" title="${esc(Rg.c[3])}">${Rg.c[2]} ${esc(Rg.c[1])}</span><span class="rq-tag rare" title="${esc(Rg.r[3])}">${Rg.r[2]} ${esc(Rg.r[1])} ✦</span>` : ''}<span class="rq-tag">🔮 魂晶 ${l.loot[0]}~${l.loot[1]}</span></div></div>`;
    const q = peek(k);
    const mis = `<div class="rq-sec"><h4>📜 到达后的任务</h4><div class="rq-mis">📜 <b>${esc(mText(q))}</b><small>${esc(D.why)}</small><small>奖励 ${rText(q)}</small></div></div>`;
    return `<div class="rq-hero" style="--lc:${l.color};${img ? `background-image:url(${img})` : `background:${l.color}`}"><div class="chips"><span class="rq-chip" style="color:${dc}">${dn}</span><span class="rq-chip" style="color:#e8dcc8">推荐战力 ${l.rec}</span></div><div class="x"><div class="g">${esc(D.tag)}</div><div class="n">${l.icon} ${esc(l.n)}</div></div></div>
      <div class="rq-desc">${esc(l.desc)}</div>${bossH}${minis}${ppl}${mats}${mis}
      <button class="rq-go" data-a="loc" data-v="${k}" style="--lc:${l.color}">出发 · 前往${esc(l.n)} ▶</button>`;
  }
  function pickHTML(ctx) {
    ctxP = ctx; css(); const S = G().S, L = Lore.LOCS;
    if (!sel || !LOC(sel)) { const last = SS().last; sel = last && LOC(last) ? last : (L.filter(l => ctx.power / l.rec >= 0.95 && !(S.bosses || {})[l.k]).pop() || L[0]).k; }
    return `<div class="rq-pick"><div class="rq-list">${L.map(itemHTML).join('')}</div><div class="rq-det">${detHTML(sel)}</div></div>`;
  }
  function bindPick() {
    const root = document.querySelector('.rq-pick'); if (!root) return;
    root.querySelector('.rq-list').addEventListener('click', e => {
      const it = e.target.closest('[data-rq]'); if (!it) return; e.stopPropagation(); sel = it.dataset.rq;
      root.querySelectorAll('.rq-it').forEach(x => x.classList.toggle('on', x.dataset.rq === sel));
      const det = root.querySelector('.rq-det'); det.innerHTML = detHTML(sel); det.scrollTop = 0; try { window.SFX && SFX.tick && SFX.tick(); } catch (e2) {}
    });
  }

  wrap(); setTimeout(wrap, 0); window.addEventListener('load', wrap);
  setInterval(() => { try { tick(); } catch (e) { console.warn('RQ tick', e); } }, 150);
  return { DATA, on, pickOn, pickHTML, bindPick, peek, roll, mText, get T() { return T; }, _tick: tick, _setup: setupTrip, SS };
})();
