// R71 DLC「首级余兴」引擎（MOD head_play，默认开）：F 回忆界面 → 「余兴」按钮组 → 对首级的小游戏合集。
// · 每个小游戏 = 一种「下一趟出猎」独特祝福，强度按表现评级 S~D（只管下一趟，回洞清空；每种游戏每回合只能演一次）。
// · 有的需要建筑（示威矛墙 / 亡者议会 / 命运骰塔 / 双生镜龛 / 新建筑「颅偶剧场」），有的不需要。
// · 独立舞台场景（三点布光 + 木桌 + 幕布），独立 rAF 循环（主循环 __pauseMain 暂停），走 Master 后处理。
// · 剧本 = 生成器：yield 秒数（等待）或 yield 提示对象（节拍环 / 抉择 / 指认 / 顺序输入）；镜头 = 机位表硬切蒙太奇。
// · 游戏内容（9 个剧本 + 文案）在 js/headplay_games.js，用 HeadPlay.reg({...}) 注册。
window.HeadPlay = (() => {
  const on = () => !window.Mods || !Mods.on || Mods.on('head_play') !== false;
  const PI = Math.PI, V3 = THREE.Vector3, Q4 = THREE.Quaternion;
  const cl = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k, sm = x => x * x * (3 - 2 * x), eo = x => 1 - Math.pow(1 - x, 3);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pk = a => a[Math.floor(Math.random() * a.length) % a.length];
  const shuf = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const G = () => window.G || window.__game;
  const GAMES = [], BY = {};
  const GRADE = { S: 1, A: 0.8, B: 0.6, C: 0.4, D: 0.2 }, GCOL = { S: '#ffd84a', A: '#ff9a5a', B: '#8fd0ff', C: '#c8ccd2', D: '#8a8a8a' };
  function reg(g) { if (BY[g.id]) return; GAMES.push(g); BY[g.id] = g; }

  // ================= 文案上下文：每颗头的身份 / 梦想 / 性格 =================
  function cx(rec) {
    const c = (rec && rec.c) || {}, I = (window.Lore && Lore.ID && Lore.ID[c.id]) || {}, acts = I.act || ['过着平凡的日子'];
    const n = (window.NM ? NM(c) : c.name) || '无名氏', id = c.idN || I.n || '女人', race = c.raceN || '';
    return { rec, c, n, id, race, ri: race && id.indexOf(race.replace(/（.*$/, '')) < 0 ? race + id : id, age: c.age || '？', loc: c.locN || '某个地方', wpn: I.wpn || '武器', act: pk(acts), act2: acts[acts.length - 1], fight: I.fight || '拼命反抗', goal: c.goal || '好好活下去', tr: (c.traits || [])[0] || '倔强', tr2: (c.traits || [])[1] || '沉默', traits: c.traits || [], belief: c.belief || '诸神', title: c.title || '', rar: c.rar | 0, idk: c.id || '', raceK: c.race || '' };
  }
  const fmt = (t, x) => String(t).replace(/\{(\w+)\}/g, (m, k) => (x && x[k] != null ? x[k] : m));
  const ageOk = c => !c || !(+c.age) || +c.age >= 18;

  // ================= 祝福（下一趟出猎）=================
  const BUFF = {
    catch: { ic: '🤹', n: '接头手', col: '#ffb86a', txt: k => `移速 +${Math.round(8 * k)}% · 每个地点第一次受到的伤害有 ${Math.round(100 * k)}% 几率被你“接住”（免伤）`, nb: k => ({ spd: 0.08 * k }) },
    eye: { ic: '👁️', n: '慧眼', col: '#8fe6ff', txt: k => `暴击率 +${Math.round(18 * k)}%（暴击伤害 ×1.75）`, nb: () => ({}) },
    mock: { ic: '📜', n: '讥讽', col: '#ffd27a', txt: k => `伤害 +${Math.round(15 * k)}%——你嘲笑过她们的梦想，砍下去更狠`, nb: k => ({ dmg: 0.15 * k }) },
    flow: { ic: '🪵', n: '魂流不息', col: '#c78bff', txt: k => `每次击杀额外 🔮+${Math.round(16 * k)}（随章节成长）并回复 ${Math.round(30 * k)} 魂能`, nb: () => ({}) },
    verdict: { ic: '⚖️', n: '判决', col: '#ff8a7a', txt: k => `对生命低于 30% 的敌人伤害 +${Math.round(45 * k)}%（行刑）`, nb: () => ({}) },
    luck: { ic: '🎲', n: '赌运', col: '#9fe8a0', txt: k => `清空奖励 +${Math.round(40 * k)}% · 每次击杀 ${Math.round(12 * k)}% 几率爆出一笔魂晶彩头`, nb: k => ({ clear: 0.4 * k }) },
    hymn: { ic: '🔔', n: '走调战歌', col: '#a8c8ff', txt: k => `每次击杀回复 ${Math.round(6 * k)}% 最大生命`, nb: k => ({ heal: 0.06 * k }) },
    infamy: { ic: '🎭', n: '恶名昭彰', col: '#ff6a8a', txt: k => `敌人生命 -${Math.round(15 * k)}%（听过你的戏）· 击杀时 7 米内的敌人有 ${Math.round(45 * k)}% 几率吓得踉跄`, nb: k => ({ fear: 0.15 * k }) },
    strike: { ic: '🎳', n: '全中', col: '#7fd0ff', txt: k => `每次击杀后 4 秒内伤害 +${Math.round(12 * k)}%（连杀叠加，最多 3 层，再杀刷新）——连锁撞倒的手感`, nb: () => ({}) },
    stitch: { ic: '🧵', n: '缝补', col: '#e07a8a', txt: k => `每趟一次：受到致命一击时不死（留 1 点生命），并回复 ${Math.round(35 * k)}% 最大生命——格罗克的线还没断`, nb: () => ({}) },
    string: { ic: '🪢', n: '提线步法', col: '#d0a0ff', txt: k => `受到伤害时 ${Math.round(14 * k)}% 几率被“线”扯开、完全闪避（触发后 3 秒内不再触发）`, nb: () => ({}) }
  };
  function st() { const S = G().S; const s = S.hplay || (S.hplay = { pend: {}, act: {}, used: {}, n: 0 }); s.pend = s.pend || {}; s.act = s.act || {}; s.used = s.used || {}; return s; }
  const inField = () => !!(window.Worlds && Worlds.active);
  const roundNo = () => { try { if (window.Loop && Loop.on && Loop.on()) return Loop.R().round; } catch (e) { } try { return (G().S.stats && G().S.stats.trips) || 0; } catch (e) { return 0; } };
  const usedNow = id => { try { return st().used[id] === roundNo(); } catch (e) { return false; } };
  function grant(bid, g, gid) { const s = st(), k = GRADE[g] || 0.2, cur = s.pend[bid]; if (!cur || cur.k <= k) s.pend[bid] = { k, g, from: gid, t: Date.now() }; s.used[gid] = roundNo(); s.n++; try { G().save && G().save(); } catch (e) { } }
  function nb() { if (!on()) return null; let src; try { src = inField() ? st().act : st().pend; } catch (e) { return null; } const o = {}; for (const id in src) { const B = BUFF[id]; if (!B) continue; const v = B.nb(src[id].k); for (const k in v) o[k] = (o[k] || 0) + v[k]; } return o; }
  const actK = id => { try { const a = st().act[id]; return inField() && a ? a.k : 0; } catch (e) { return 0; } };
  function buffList(which) { let src = {}; try { src = which === 'act' ? st().act : st().pend; } catch (e) { } return Object.keys(src).filter(id => BUFF[id]).map(id => ({ id, B: BUFF[id], k: src[id].k, g: src[id].g, from: src[id].from })); }
  function buffsHTML(which) { const L = buffList(which || 'pend'); if (!L.length) return ''; return L.map(x => `<div class="hpb" style="--c:${x.B.col}"><b>${x.B.ic} ${esc(x.B.n)} <i>${x.g}</i></b><span>${esc(x.B.txt(x.k))}</span></div>`).join(''); }
  // 出发 / 回洞：待生效 → 生效中 → 清空
  let wasW = false, nodeW = null, caught = false;
  setInterval(() => { try { if (!G() || !G().S) return; const w = inField(), s = st(); if (w && !wasW) { s.act = s.pend; s.pend = {}; stitched = false; strT = 0; if (Object.keys(s.act).length) setTimeout(() => { try { G().toast(`🎪 余兴祝福生效：${buffList('act').map(x => x.B.ic + x.B.n + x.g).join(' · ')}`, '#ffd8a0', 4); } catch (e) { } }, 2500); } if (!w && wasW) s.act = {}; wasW = w; chip(); } catch (e) { } }, 600);
  let chipEl = null;
  function chip() { const L = inField() ? buffList('act') : []; if (!L.length) { if (chipEl) chipEl.style.display = 'none'; return; } if (!chipEl) { chipEl = document.createElement('div'); chipEl.style.cssText = 'position:fixed;right:14px;bottom:150px;z-index:33;pointer-events:none;font:700 12.5px system-ui,"Microsoft YaHei",sans-serif;color:#f4e6cf;text-shadow:0 1px 3px #000;text-align:right;line-height:1.5'; document.body.appendChild(chipEl); } const h = L.map(x => `<span style="color:${x.B.col}">${x.B.ic} ${esc(x.B.n)} ${x.g}</span>`).join('<br>'); if (chipEl._h !== h) { chipEl._h = h; chipEl.innerHTML = h; } chipEl.style.display = document.body.classList.contains('menuon') ? 'none' : 'block'; }
  // 独特效果：包住 Rogue 的命中/受伤/事件钩子（foe.js / worlds.js 已在调用它们）
  function out(fo, info, d) {
    let k = actK('eye'); if (k && !info.crit && Math.random() < 0.18 * k) { info.crit = true; d = Math.round(d * 1.75); }
    k = actK('verdict'); if (k && fo && fo.maxHp > 0 && fo.hp / fo.maxHp < 0.3) d = Math.round(d * (1 + 0.45 * k));
    k = actK('strike'); if (k && stk && performance.now() < stkT) d = Math.round(d * (1 + 0.12 * k * stk));
    return d;
  }
  let stk = 0, stkT = 0, stitched = false, strT = 0;
  function inn(fo, n) {
    if (!(n > 0)) return n; let k = actK('string');
    if (k && performance.now() > strT && Math.random() < 0.14 * k) { strT = performance.now() + 3000; try { G().toast('🪢 线一扯——你被拽开半步，这一下落空了', '#e0c8ff', 1.4); } catch (e) { } return 0; }
    k = actK('catch'); const W = window.Worlds && Worlds._W;
    if (k && W) { if (nodeW !== W.cur) { nodeW = W.cur; caught = false; } if (!caught) { caught = true; if (Math.random() < k) { try { G().toast('🤹 接住了！——杂耍练出来的手，这一下没伤着你', '#ffd8a0', 1.6); } catch (e) { } return 0; } } }
    k = actK('stitch'); if (k && !stitched) { try { const g = G(), hp = g.S.hp; if (n >= hp) { stitched = true; const mx = g.st().maxHp; setTimeout(() => { try { g.S.hp = Math.min(mx, g.S.hp + mx * 0.35 * k); g.flash && g.flash('#ff8aa0', 0.5, 400); } catch (e) { } }, 60); g.toast('🧵 线没断——你被缝了回来（本趟用掉了）', '#ffb0c0', 2.6); return Math.max(0, hp - 1); } } catch (e) { } }
    return n;
  }
  function ev(t, fo) {
    if (t !== 'kill' || !fo) return; const g = G();
    let k = actK('strike'); if (k) { const now = performance.now(); stk = now < stkT ? Math.min(3, stk + 1) : 1; stkT = now + 4000; }
    k = actK('flow'); if (k) { const ch = (() => { try { return Loop.R().chap || 1; } catch (e) { return 1; } })(), n = Math.round(16 * k * (1 + 0.4 * (ch - 1))); try { g.addCoins(n); const W = Worlds._W; if (W && W.trip) W.trip.coins += n; } catch (e) { } try { window.Talents && Talents.addMana && Talents.addMana(30 * k); } catch (e) { } }
    k = actK('luck'); if (k && Math.random() < 0.12 * k) { try { const W = Worlds._W, L = W && W.graph && W.graph.loc && W.graph.loc.loot, n = Math.round(((L ? (L[0] + L[1]) / 2 : 20) * 0.9) * (0.6 + k)); g.addCoins(n); if (W && W.trip) W.trip.coins += n; g.toast(`🎲 彩头！🔮+${n}——命运骰塔又欠你一次`, '#9fe8a0', 2); SFX.coins && SFX.coins(); } catch (e) { } }
    k = actK('infamy'); if (k && window.Foe && Foe.foes) { let said = false; for (const o of Foe.foes) { if (o === fo || o.dead || !o.pos || !fo.pos || o.pos.distanceTo(fo.pos) > 7) continue; if (Math.random() < 0.45 * k) { o.stag = Math.max(o.stag || 0, 0.6); o.atk = null; if (!said && Foe.say) { said = true; try { Foe.say(o, pk(['是、是那个演戏的食人魔……！', '他会把我的头也搬上台……', '别看我！别看我！', '我不要演配角……！']), '#ffd0e0'); } catch (e) { } } } } }
  }
  function hook() {
    const R = window.Rogue; if (!R || R.__hp) return !!R; R.__hp = 1;
    const o0 = R.outDmg, i0 = R.inDmg, e0 = R.event;
    R.outDmg = function (fo, info, dealt) { let d = dealt; try { const r = o0 ? o0.apply(this, arguments) : dealt; d = isFinite(r) ? r : dealt; } catch (e) { } try { return on() ? out(fo, info || {}, d) : d; } catch (e) { return d; } };
    R.inDmg = function (fo, n) { let v = n; try { const r = i0 ? i0.apply(this, arguments) : n; v = isFinite(r) ? r : n; } catch (e) { } try { return on() ? inn(fo, v) : v; } catch (e) { return v; } };
    R.event = function (t, fo) { try { e0 && e0.apply(this, arguments); } catch (e) { } try { if (on()) ev(t, fo); } catch (e) { } };
    return true;
  }
  { const iv = setInterval(() => { if (hook()) clearInterval(iv); }, 1000); }

  // ================= 新建筑：颅偶剧场（用现成 CC0 模型拼，不做新模型）=================
  function regBuild() {
    const BC = window.BuildCat; if (!BC || !BC.C || BC.C.hp_stage || !window.Assets) return false; const A = Assets;
    BC.C.hp_stage = { cat: 'func', n: '颅偶剧场', icon: '🎭', base: 650, grow: 1.8, max: 1, fp: [1.0, 0.6], stat: { ter: 1, soul: 1 }, depth: 1,
      desc: '一张铺着旧幕布的木桌，两盏灯笼当脚灯——格罗克的私人剧场。对任意首级按 F →「余兴」→《她的一生（删减版）》：三颗首级当木偶，你配音、你拍桌、你谢幕。演得好，下一趟出猎的敌人都“听过你的戏”。',
      make() { const g = new THREE.Group();
        if (A.has('WoodenTable_01')) { const t = A.fit('WoodenTable_01', { w: 1.0 }); if (t) g.add(t); } else g.add(BC.box(1.0, 0.75, 0.6, BC.M.dark, 0, 0.375, 0));
        if (A.has('Lantern_01')) for (const sx of [-0.42, 0.42]) { const l = A.fit('Lantern_01', { h: 0.28, x: sx, z: 0.22 }); if (l) { l.position.y += 0.76; g.add(l); g.add(BC.flame(sx, 0.86, 0.22, 0.5, '#ffb070')); } }
        if (A.has('brass_candleholders')) { const c = A.fit('brass_candleholders', { w: 0.3, z: -0.18 }); if (c) { c.position.y += 0.76; g.add(c); } }
        return g; },
      cols: () => [[-0.5, 0, -0.3, 0.5, 0.8, 0.3]] };
    if (window.Unlocks && Unlocks.R && !Unlocks.R.hp_stage) Unlocks.R.hp_stage = [S => ((S.stats && S.stats.trips) || 0) >= 1, '第一次出猎回来，你对着满洞的首级突然有了表演欲——你需要一个舞台。'];
    return true;
  }
  { const iv = setInterval(() => { if (regBuild()) clearInterval(iv); }, 500); setTimeout(() => clearInterval(iv), 60000); }

  // ================= 选角：洞里 + 魂库的首级 =================
  function pool(rec) {
    const g = G(), out = [], seen = new Set([rec]); const rid = rec && rec.id;
    const add = r => { if (!r || !r.c || !r.look || seen.has(r) || (rid != null && r.id === rid) || !ageOk(r.c) || r.inBag) return; seen.add(r); out.push(r); };
    for (const h of (g.heads || [])) add(h.rec); for (const r of ((g.S && g.S.heads) || [])) add(r);
    return out;
  }
  function castFor(gm, rec) { const p = shuf(pool(rec)), ids = new Set([rec.c && rec.c.id]), out = [rec]; for (const r of p) { if (out.length >= gm.heads) break; if (!ids.has(r.c.id)) { ids.add(r.c.id); out.push(r); } } for (const r of p) { if (out.length >= gm.heads) break; if (!out.includes(r)) out.push(r); } return out; }
  function needName(t) { try { return (window.Recall && Recall.bn && Recall.bn(t)) || (BuildCat.C[t] && BuildCat.C[t].n) || t; } catch (e) { return t; } }
  function btn(id, rec) {
    const gm = BY[id]; if (!gm) return null; const o = { ic: gm.ic, n: gm.n, d: `${gm.sub} · ${gm.d}　→ 下一趟：${BUFF[gm.buff].ic}${BUFF[gm.buff].n}`, lock: false, why: '' };
    if (!on()) { o.lock = true; o.why = 'MOD「首级余兴」已关闭'; }
    else if (rec && rec.c && !ageOk(rec.c)) { o.lock = true; o.why = '只有成年人的首级能上台'; }
    else if (gm.need && !(window.Recall && Recall.hasB && Recall.hasB([gm.need]))) { o.lock = true; o.why = `需要建筑：${needName(gm.need)}`; }
    else if (gm.bodies && !(window.Bodies && Bodies.on() && Bodies.count() >= gm.bodies)) { o.lock = true; o.why = `需要无头身体 ×${gm.bodies}（野外斩首后，在尸体的战利品里「🧍 扛走身体」）`; }
    else if (pool(rec).length < gm.heads - 1) { o.lock = true; o.why = `需要至少 ${gm.heads} 颗首级（洞里 + 魂库）`; }
    else if (usedNow(id)) { o.lock = true; o.why = '这一回合已经演过了——出猎回来再演'; }
    return o;
  }

  // ================= 声音（WebAudio 合成，走 SFX 总线）=================
  const ac = () => (window.SFX && SFX.on && SFX.ctx) ? SFX.ctx : null;
  let NB = null; const nbuf = X => { if (!NB || NB.sampleRate !== X.sampleRate) { const n = X.sampleRate; NB = X.createBuffer(1, n, n); const d = NB.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } return NB; };
  function tone(f0, f1, dur, vol, type, dl) { const X = ac(); if (!X || !(vol > 0)) return; const t = X.currentTime + (dl || 0), o = X.createOscillator(), g = X.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(SFX.out); o.start(t); o.stop(t + dur + 0.05); }
  function nz(dur, vol, type, f0, f1, q, dl) { const X = ac(); if (!X || !(vol > 0)) return; const t = X.currentTime + (dl || 0), s = X.createBufferSource(); s.buffer = nbuf(X); const f = X.createBiquadFilter(); f.type = type; f.Q.value = q || 1; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); const g = X.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(SFX.out); s.start(t, Math.random() * 0.5, dur + 0.05); }
  function bell(f, v) { tone(f, f * 0.995, 1.6, 0.16 * (v || 1), 'sine'); tone(f * 2.76, f * 2.7, 0.7, 0.05 * (v || 1), 'sine'); tone(f * 5.4, f * 5.3, 0.35, 0.025 * (v || 1), 'triangle'); nz(0.06, 0.05, 'highpass', 4000, 0, 1); }
  const SND = {
    tick: () => tone(1800, 1700, 0.05, 0.05, 'square'), thud: () => { tone(110, 40, 0.35, 0.5); nz(0.18, 0.25, 'lowpass', 900, 120, 0.8); },
    gavel: () => { tone(180, 60, 0.25, 0.55, 'triangle'); nz(0.12, 0.4, 'bandpass', 1400, 400, 1.2); tone(90, 40, 0.5, 0.3, 'sine', 0.02); },
    whoosh: () => nz(0.28, 0.12, 'bandpass', 600, 2400, 1.4), catch: () => { tone(160, 70, 0.14, 0.3); nz(0.06, 0.14, 'lowpass', 1200, 300, 0.7); },
    drop: () => { tone(90, 35, 0.5, 0.5); nz(0.3, 0.3, 'lowpass', 600, 80, 0.7); }, pop: () => { tone(900, 1500, 0.08, 0.12, 'sine'); nz(0.05, 0.08, 'highpass', 3000, 0, 1); },
    good: () => { tone(660, 990, 0.12, 0.08, 'triangle'); tone(990, 1320, 0.14, 0.06, 'triangle', 0.06); }, bad: () => { tone(220, 110, 0.3, 0.12, 'sawtooth'); nz(0.2, 0.06, 'lowpass', 500, 120, 1); },
    cheer: () => { for (let i = 0; i < 6; i++) nz(0.5 + Math.random() * 0.4, 0.05, 'bandpass', 900 + Math.random() * 1400, 700 + Math.random() * 900, 2, i * 0.05); }, boo: () => { tone(140, 110, 0.9, 0.08, 'sawtooth'); nz(0.8, 0.05, 'bandpass', 300, 240, 3); },
    drum: () => { for (let i = 0; i < 14; i++) nz(0.06, 0.05 + i * 0.006, 'bandpass', 220, 180, 2, i * 0.07); }, sting: () => { tone(220, 216, 1.2, 0.08, 'sawtooth'); tone(233, 230, 1.2, 0.06, 'sawtooth'); tone(55, 50, 1.4, 0.2); },
    crystal: () => { for (let i = 0; i < 4; i++) tone(1400 + Math.random() * 900, 1300, 0.18, 0.04, 'sine', i * 0.04); }, swish: () => nz(0.18, 0.1, 'highpass', 2000, 5000, 0.8),
    fan: () => { try { SFX.fanfare && SFX.fanfare(2); } catch (e) { } }, coins: () => { try { SFX.coins && SFX.coins(); } catch (e) { } }
  };
  const snd = (n, a) => { try { if (SND[n]) SND[n](a); } catch (e) { } };

  // ================= 界面 =================
  const CSS = `#hpRoot{position:fixed;inset:0;z-index:96;pointer-events:none;font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif;color:#f3e7d3;--c:#ffd27a}
#hpRoot .bar{position:absolute;left:0;right:0;height:9.5vh;background:#000;transition:transform .45s cubic-bezier(.2,.8,.2,1);z-index:2}#hpRoot .bt{top:0;transform:translateY(-101%)}#hpRoot .bb{bottom:0;transform:translateY(101%)}#hpRoot.in .bar{transform:none}
#hpRoot .blk{position:absolute;inset:0;background:#000;opacity:1;transition:opacity .8s;z-index:1}#hpRoot.in .blk{opacity:0}
#hpRoot .ttl{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:5;opacity:0;transition:opacity .6s;text-align:center}#hpRoot .ttl.on{opacity:1}
#hpRoot .ttl small{font:600 15px/1 'Noto Serif SC',serif;letter-spacing:.6em;color:var(--c);padding-left:.6em}#hpRoot .ttl b{display:block;font:900 clamp(40px,6.4vw,84px)/1.15 'Noto Serif SC','Songti SC',serif;letter-spacing:.2em;padding-left:.2em;color:#fff;text-shadow:0 0 40px color-mix(in srgb,var(--c) 60%,transparent),0 4px 0 #2a0a10;margin:10px 0 6px}
#hpRoot .ttl i{font-style:normal;font-size:17px;color:#e6d4b8;letter-spacing:.12em}#hpRoot .ttl .cast{margin-top:20px;font-size:14.5px;line-height:1.9;color:#cdbb9f}#hpRoot .ttl .cast em{font-style:normal;color:var(--c);margin-right:.4em}
#hpRoot .hud{position:absolute;top:calc(9.5vh + 10px);left:22px;right:22px;display:flex;justify-content:space-between;align-items:flex-start;z-index:3;opacity:0;transition:opacity .4s;text-shadow:0 1px 4px #000}#hpRoot.play .hud{opacity:1}
#hpRoot .hud .gn{font:800 17px 'Noto Serif SC',serif;letter-spacing:.2em;color:var(--c)}#hpRoot .hud .gn small{display:block;font:600 12px system-ui;letter-spacing:.1em;color:#cdbb9f;margin-top:3px}
#hpRoot .mt{min-width:240px;text-align:right}#hpRoot .mt .l{font-size:12.5px;letter-spacing:.2em;color:#e8d8c0}#hpRoot .mt .l b{font-size:20px;color:#fff;margin-left:6px}#hpRoot .mt .g{height:8px;margin-top:5px;background:#0009;border:1px solid #ffffff40;border-radius:5px;overflow:hidden}#hpRoot .mt .g i{display:block;height:100%;width:0;background:linear-gradient(90deg,color-mix(in srgb,var(--c) 50%,#000),var(--c));transition:width .25s}
#hpRoot .mt .cb{margin-top:4px;font-size:13px;color:#ffe9b0;min-height:16px}
#hpRoot .sb{position:absolute;left:50%;bottom:calc(9.5vh + 26px);transform:translateX(-50%);width:min(980px,86vw);text-align:center;z-index:4;opacity:0;transition:opacity .25s}#hpRoot .sb.on{opacity:1}
#hpRoot .sb .who{display:inline-block;font:800 13.5px system-ui;letter-spacing:.18em;color:#1a0d08;background:var(--wc,var(--c));padding:2px 12px;margin-bottom:6px;border-radius:2px}
#hpRoot .sb .tx{font:700 clamp(18px,2.2vw,25px)/1.6 'Noto Serif SC','Songti SC',serif;color:#fff;text-shadow:0 2px 10px #000,0 0 3px #000}#hpRoot .sb.nar .tx{font-style:italic;font-weight:600;color:#eadcc4}
#hpRoot canvas.cv{position:absolute;inset:0;width:100%;height:100%;z-index:3}
#hpRoot .ch{position:absolute;left:50%;bottom:calc(9.5vh + 120px);transform:translateX(-50%);display:flex;gap:16px;z-index:6;pointer-events:auto}#hpRoot .ch.hide{display:none}
#hpRoot .ch .cd{position:relative;width:min(260px,26vw);padding:14px 16px 12px;background:linear-gradient(170deg,#24141aee,#0e080cf2);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 70%,transparent),0 10px 30px #000c;cursor:pointer;opacity:0;transform:translateY(16px);animation:hpIn .3s ease-out forwards;transition:transform .12s}
#hpRoot .ch .cd:hover{transform:translateY(-5px)}#hpRoot .ch .cd:nth-child(2){animation-delay:.05s}#hpRoot .ch .cd:nth-child(3){animation-delay:.1s}@keyframes hpIn{to{opacity:1;transform:none}}
#hpRoot .ch .cd .k{position:absolute;top:-12px;left:-12px;width:30px;height:30px;border-radius:50%;background:#0c0709;box-shadow:inset 0 0 0 2px var(--c);text-align:center;line-height:30px;font-weight:900}
#hpRoot .ch .cd b{display:block;font:800 17px 'Noto Serif SC',serif;color:#fff;margin-bottom:5px}#hpRoot .ch .cd span{font-size:13.5px;line-height:1.55;color:#d6c6ae}
#hpRoot .ch .cd.pick{transform:scale(1.05);box-shadow:inset 0 0 0 2px var(--c),0 0 40px color-mix(in srgb,var(--c) 50%,transparent)}#hpRoot .ch .cd.dim{opacity:.35!important}
#hpRoot .tq{position:absolute;left:50%;bottom:calc(9.5vh + 98px);transform:translateX(-50%);width:min(560px,60vw);height:4px;background:#0008;z-index:6}#hpRoot .tq i{display:block;height:100%;background:var(--c);width:100%}#hpRoot .tq.hide{display:none}
#hpRoot .ql{position:absolute;left:50%;bottom:calc(9.5vh + 216px);transform:translateX(-50%);font:800 18px 'Noto Serif SC',serif;letter-spacing:.2em;color:var(--c);text-shadow:0 2px 8px #000;z-index:6;white-space:nowrap}#hpRoot .ql.top{bottom:auto;top:calc(9.5vh + 58px);font-size:21px}
#hpRoot .lab{position:absolute;transform:translate(-50%,-100%);font:900 15px system-ui;color:#fff;background:#000a;border:1px solid var(--c);padding:2px 9px;border-radius:12px;white-space:nowrap;z-index:6;text-shadow:0 1px 2px #000}
#hpRoot .jg{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);font:900 34px 'Noto Serif SC',serif;letter-spacing:.15em;opacity:0;z-index:6;text-shadow:0 0 20px currentColor,0 3px 0 #000}#hpRoot .jg.go{animation:hpJg .55s ease-out}@keyframes hpJg{0%{opacity:0;transform:translate(-50%,-50%) scale(1.5)}20%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-80%) scale(.95)}}
#hpRoot .bn{position:absolute;left:0;right:0;top:30%;text-align:center;opacity:0;z-index:6}#hpRoot .bn b{display:block;font:900 clamp(34px,4.6vw,60px)/1.2 'Noto Serif SC',serif;letter-spacing:.25em;color:#fff;text-shadow:0 0 30px var(--bc,var(--c)),0 3px 0 #000}#hpRoot .bn small{display:block;font-size:17px;color:#f0dcc0;margin-top:6px;letter-spacing:.15em;text-shadow:0 2px 6px #000}#hpRoot .bn.go{animation:hpBn var(--bd,1.6s) ease-out}@keyframes hpBn{0%{opacity:0;transform:scale(1.2)}12%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
#hpRoot .fl{position:absolute;inset:0;opacity:0;z-index:2;pointer-events:none}
#hpRoot .cur{position:absolute;top:0;bottom:0;width:51%;z-index:4;background:repeating-linear-gradient(90deg,#4a0a14 0,#6a1220 3%,#3a0610 6%);box-shadow:inset 0 -40px 60px #0008;transition:transform 1.6s cubic-bezier(.6,0,.2,1)}#hpRoot .cur.l{left:0;transform:translateX(-100%)}#hpRoot .cur.r{right:0;transform:translateX(100%)}#hpRoot.shut .cur{transform:none}
#hpRoot .rs{position:absolute;left:50%;top:50%;transform:translate(-50%,-46%);width:min(620px,88vw);padding:26px 30px 20px;background:linear-gradient(170deg,#24141af4,#0b0709f8);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 70%,transparent),0 30px 90px #000;opacity:0;transition:opacity .45s,transform .45s;z-index:8;pointer-events:auto}#hpRoot .rs.on{opacity:1;transform:translate(-50%,-50%)}
#hpRoot .rs .gr{float:right;font:900 82px/0.9 'Noto Serif SC',serif;color:var(--gc);text-shadow:0 0 30px var(--gc)}#hpRoot .rs h3{margin:0;font:900 26px 'Noto Serif SC',serif;letter-spacing:.15em;color:#fff}#hpRoot .rs h3 small{display:block;font:600 13px system-ui;letter-spacing:.2em;color:var(--c);margin-top:4px}
#hpRoot .rs .ln{margin:14px 0 10px;font-size:14.5px;line-height:1.75;color:#e2d2ba;clear:both}#hpRoot .rs .st{font-size:13px;color:#bfae94;line-height:1.7}#hpRoot .rs .st b{color:#fff}
#hpRoot .rs .bf{margin-top:12px;padding:10px 14px;border-left:3px solid var(--bc);background:#ffffff0c}#hpRoot .rs .bf b{display:block;font:800 16px 'Noto Serif SC',serif;color:var(--bc)}#hpRoot .rs .bf span{font-size:13.5px;color:#eadcc4;line-height:1.6}
#hpRoot .rs .ex{margin-top:8px;font-size:12.5px;color:#a8ffb8}#hpRoot .rs .go2{margin-top:14px;text-align:center;font-size:13px;color:#cdbb9f;letter-spacing:.15em}
#hpRoot .ky{position:absolute;left:0;right:0;bottom:calc(9.5vh - 30px);text-align:center;font-size:12.5px;color:#b8a890;z-index:4;letter-spacing:.1em}#hpRoot .ky b{color:#fff;background:#ffffff1a;padding:1px 7px;border-radius:3px;margin:0 2px}
#riw.hpon .rcard,#riw.hpon .rbar,#riw.hpon .hint,#riw.hpon .x,#riw.hpon .sub,#riw.hpon .pn,#riw.hpon .tipb,#riw.hpon .pr{visibility:hidden!important}
.hpb{margin-top:6px;padding:5px 9px;border-left:3px solid var(--c);background:#ffffff0a;font-size:12px;line-height:1.5;color:#d9ccb8}.hpb b{display:block;color:var(--c);font-size:12.5px}.hpb i{font-style:normal;color:#fff;margin-left:4px}
.hpmh{font:700 16px 'Noto Serif SC',serif;letter-spacing:.12em;color:#ffd27a;margin-bottom:4px}.hpmn{font-size:12px;color:#b4a290;line-height:1.65}.hpmn b{color:#fff}
.hpm{position:relative;margin:8px 0;padding:8px 10px 8px 34px;border-radius:8px;background:#ffffff08;border:1px solid #ffffff14;border-left:3px solid var(--c);cursor:pointer;transition:background .12s,border-color .12s}.hpm:hover{background:#ffffff16;border-color:var(--c)}
.hpm .k{position:absolute;left:11px;top:9px;font:700 12px monospace;color:#e8c070}.hpm b{display:block;font-size:14.5px;color:#fff}.hpm b i{font-style:normal;font-weight:500;font-size:11.5px;color:#bba88f;margin-left:7px}
.hpm small{display:block;font-size:11.5px;color:#a89886;margin:1px 0 3px}.hpm .d{display:block;font-size:12.5px;line-height:1.55;color:#d6c6ae}.hpm em{display:block;font-style:normal;font-size:12px;margin-top:3px;color:var(--c)}
.hpm.lk{opacity:.55;cursor:not-allowed}.hpm.lk:hover{background:#ffffff08}.hpm .why{display:block;font-size:12px;color:#ff9a8a;margin-top:2px}.hpm.dn b:after{content:' ✓';color:#9fe08a;font-size:12px}`;
  let root = null, cv = null, g2 = null;
  function css() { if (!document.getElementById('hpCss')) { const s = document.createElement('style'); s.id = 'hpCss'; s.textContent = CSS; document.head.appendChild(s); } }
  function ui() {
    css();
    if (root) root.remove(); root = document.createElement('div'); root.id = 'hpRoot';
    root.innerHTML = `<div class="blk"></div><div class="fl"></div><div class="cur l"></div><div class="cur r"></div><canvas class="cv"></canvas><div class="hud"><div class="gn"></div><div class="mt"><div class="l"></div><div class="g"><i></i></div><div class="cb"></div></div></div>
<div class="sb"><div class="who"></div><div class="tx"></div></div><div class="ql"></div><div class="ch hide"></div><div class="tq hide"><i></i></div><div class="jg"></div><div class="bn"><b></b><small></small></div><div class="ttl"><small></small><b></b><i></i><div class="cast"></div></div><div class="rs"></div><div class="ky"></div><div class="bar bt"></div><div class="bar bb"></div>`;
    document.body.appendChild(root); cv = root.querySelector('.cv'); g2 = cv.getContext('2d');
    root.querySelector('.ch').addEventListener('click', e => { const c = e.target.closest('.cd'); if (c && Z && Z.choice) answer(+c.dataset.i); });
    root.querySelector('.rs').addEventListener('click', () => { if (Z && Z.phase === 'res') close(); });
    return root;
  }
  const q = s => root.querySelector(s);
  function say(text, who, col) { const b = q('.sb'); b.classList.remove('on'); clearTimeout(say.t); say.t = setTimeout(() => { if (!root) return; b.classList.toggle('nar', !who); const w = b.querySelector('.who'); w.style.display = who ? 'inline-block' : 'none'; w.textContent = who || ''; w.style.setProperty('--wc', col || ''); b.querySelector('.tx').innerHTML = text; b.classList.add('on'); }, 90); }
  function unsay() { const b = q('.sb'); if (b) b.classList.remove('on'); }
  function pop(t, c) { const e = q('.jg'); e.textContent = t; e.style.color = c || '#fff'; e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); }
  function banner(t, s, c, d) { const e = q('.bn'); e.querySelector('b').textContent = t; e.querySelector('small').textContent = s || ''; e.style.setProperty('--bc', c || ''); e.style.setProperty('--bd', (d || 1.6) + 's'); e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); }
  function flash(col, a) { const f = q('.fl'); f.style.transition = 'none'; f.style.background = col || '#fff'; f.style.opacity = a || 0.5; void f.offsetWidth; f.style.transition = 'opacity .5s'; f.style.opacity = 0; }
  function keys(html) { q('.ky').innerHTML = html || ''; }
  function meter(label, v, cb) { q('.mt .l').innerHTML = label; q('.mt .g i').style.width = Math.round(cl(v, 0, 1) * 100) + '%'; q('.mt .cb').textContent = cb || ''; }

  // ================= 舞台 =================
  let Z = null;
  const _a = new V3(), _b = new V3(), _c = new V3(), _q1 = new Q4(), _q2 = new Q4(), _e = new THREE.Euler(), _m = new THREE.Matrix4(), _UP = new V3(0, 1, 0), _ZA = new V3(0, 0, 1);
  const SEAT = new V3(0, 0.36, 0.98), LOOK = new V3(0, 0.13, 0);
  function stage() {
    const sc = new THREE.Scene(); sc.background = new THREE.Color('#0b0809'); sc.fog = new THREE.Fog('#0b0809', 2.4, 7);
    sc.add(new THREE.HemisphereLight(0xffe6cc, 0x140c0e, 0.55));
    const key = new THREE.SpotLight(0xffd6a6, 2.6, 7, 0.62, 0.55, 1); key.position.set(-0.95, 2.0, 1.35); key.target.position.set(0, 0.12, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005; key.shadow.camera.near = 0.4; key.shadow.camera.far = 6; sc.add(key, key.target);
    const rim = new THREE.SpotLight(0xa8c4ff, 2.2, 7, 0.7, 0.7, 1); rim.position.set(1.2, 1.5, -1.5); rim.target.position.set(0, 0.16, 0); sc.add(rim, rim.target);
    const fill = new THREE.PointLight(0xff9a70, 0.45, 3.5, 2); fill.position.set(0.9, 0.45, 1.3); sc.add(fill);
    const glow = new THREE.PointLight(0xffffff, 0, 1.6, 2); glow.position.set(0, 0.35, 0.2); sc.add(glow); // 剧本用的“魂光”灯（始终存在，只改强度：不触发重编着色器）
    let top = null; try { if (window.Assets && Assets.has('WoodenTable_01')) { top = Assets.fit('WoodenTable_01', { w: 1.5 }); } } catch (e) { top = null; }
    if (top) { top.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(top); top.position.y -= bb.max.y; top.position.z += 0.05; top.traverse(o => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = true; } }); sc.add(top); }
    else { const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.9), new THREE.MeshStandardMaterial({ color: '#3a2618', roughness: 0.75 })); m.position.y = -0.025; m.receiveShadow = true; m.userData.own = 1; sc.add(m); }
    const back = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), new THREE.MeshStandardMaterial({ color: '#3a0a12', roughness: 0.95 })); back.position.set(0, 1.2, -1.8); back.receiveShadow = true; back.userData.own = 1; sc.add(back);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 9).rotateX(-PI / 2), new THREE.MeshStandardMaterial({ color: '#120c0c', roughness: 1 })); floor.position.y = -0.78; floor.receiveShadow = true; floor.userData.own = 1; sc.add(floor);
    const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.02, 30); cam.position.copy(SEAT); cam.lookAt(LOOK); sc.add(cam);
    return { sc, cam, key, rim, fill, glow };
  }
  // 头：锚点（头组局部）→ g 局部；摆放 = 让“中心锚点”落在目标点
  function anchors(hd) {
    const M = hd.hb.meta || {}, eyeY = M.eye && M.eye[1] != null ? M.eye[1] : -0.012, front = M.front != null ? M.front : 0.083, bottom = M.bottom != null ? M.bottom : -0.0965, top = M.skullTop != null ? M.skullTop : 0.0965, cut = M.cut || {}, mY = eyeY - 0.0655, ex = M.eye && M.eye[0] ? Math.abs(M.eye[0]) : 0.016;
    const F = { eyes: new V3(0, eyeY, front - 0.012), eyeL: new V3(ex, eyeY, front - 0.008), eyeR: new V3(-ex, eyeY, front - 0.008), mouth: new V3(0, mY, front - 0.004), face: new V3(0, (eyeY + mY) / 2, front - 0.02), cut: new V3(cut.x || 0, bottom, cut.z != null ? cut.z : -0.006), center: new V3(0, (bottom + top) / 2, 0), crown: new V3(0, top, -0.01), chin: new V3(0, mY - 0.02, front - 0.02) };
    const g = hd.g, p0 = g.parent; if (p0) p0.remove(g); g.position.set(0, 0, 0); g.quaternion.identity(); g.updateMatrixWorld(true);
    hd.L = {}; for (const k in F) hd.L[k] = hd.hb.group.localToWorld(F[k].clone()); hd.H = hd.L.crown.y - hd.L.cut.y; hd.F = F;
  }
  function headObj(rec, hb, g, temp, i) { const L0 = rec.look || {}; return { i, rec, hb, g, temp, x: cx(rec), P: new V3(), q: new Q4(), Pt: new V3(), qt: new Q4(), rate: 9, snap: true, exT: Object.assign({}, L0.ex || {}), exC: {}, base: Object.assign({}, L0.ex || {}), roll: [0, 0], rollT: (L0.rl || [0, 0]).slice(), tg: 0, tgT: (L0.tg || 0) * 0.04, talk: 0, bob: 0, sw: new V3(), glow: 0, exK: '' }; }
  function wA(hd, k, out) { return out.copy(hd.L[k] || hd.L.center).applyQuaternion(hd.g.quaternion).add(hd.g.position); }
  function placeHd(hd) { hd.g.quaternion.copy(hd.q); hd.g.position.copy(hd.P).sub(_a.copy(hd.L.center).applyQuaternion(hd.q)); hd.g.updateMatrixWorld(true); }
  // 头的姿态：P = 中心位置，r = [俯仰, 偏航, 翻滚]（面朝 +Z = 朝观众）
  function at(i, p, r, rate) { const hd = Z.hd[i]; if (!hd) return; if (p) hd.Pt.set(p[0], p[1], p[2]); if (r) hd.qt.setFromEuler(_e.set(r[0] || 0, r[1] || 0, r[2] || 0, 'YXZ')); hd.rate = rate || 9; }
  function rest(i, x, z, yaw, rate) { const hd = Z.hd[i]; at(i, [x, hd.H * 0.5 + 0.004, z], [0, yaw || 0, 0], rate); }
  function ex(i, e, keep) { const hd = Z.hd[i]; if (!hd) return; hd.exT = Object.assign(keep ? Object.assign({}, hd.exT) : Object.assign({}, hd.base), e || {}); }
  // 头装到身体上：neck（断口对断口）/ hands（捧在两只手之间）/ handR……；k<1 时从原位置沿弧线搬过去
  function attStep(hd, dt) {
    const A = hd.att; A.b.tip(A.kind, _c, _q1); if (A.rqT) A.rq.slerp(A.rqT, 1 - Math.exp(-dt * 5)); _q2.copy(_q1).multiply(A.rq);
    _b.copy(hd.L.center).sub(hd.L[A.anc] || hd.L.cut).applyQuaternion(_q2).add(_c); if (A.off) _b.add(A.off);
    if (A.k < 1) { A.k = Math.min(1, A.k + dt / A.dur); const e = sm(A.k); hd.P.lerpVectors(A.p0, _b, e); hd.P.y += Math.sin(PI * e) * A.arc; hd.q.slerpQuaternions(A.q0, _q2, e); }
    else { hd.P.copy(_b); hd.q.copy(_q2); }
    hd.Pt.copy(hd.P); hd.qt.copy(hd.q);
  }
  function updHeads(dt, now) {
    for (const hd of Z.hd) {
      if (hd.att) attStep(hd, dt);
      else if (!hd.direct) { if (hd.snap) { hd.P.copy(hd.Pt); hd.q.copy(hd.qt); hd.snap = false; } else { const k = 1 - Math.exp(-dt * hd.rate); hd.P.lerp(hd.Pt, k); hd.q.slerp(hd.qt, k); } }
      if (hd.bob > 0) { hd.bob = Math.max(0, hd.bob - dt); }
      const bp = hd.talk > 0 ? Math.abs(Math.sin(now * 13 + hd.i)) * 0.012 : 0; if (bp) { hd.P.y += bp; }
      placeHd(hd); if (bp) hd.P.y -= bp;
      // 表情
      const T = Object.assign({}, hd.exT); if (hd.talk > 0) { hd.talk -= dt; const m = Math.abs(Math.sin(now * 17 + hd.i * 1.7)); T.aa = Math.max(T.aa || 0, 0.15 + 0.6 * m); T.oh = Math.max(T.oh || 0, 0.25 * (1 - m)); }
      const C = hd.exC, outE = {}; let key = '';
      for (const k of new Set([...Object.keys(C), ...Object.keys(T)])) { const rt = (k === 'aa' || k === 'oh') ? 30 : k === 'blink' ? 14 : 5; C[k] = (C[k] || 0) + ((T[k] || 0) - (C[k] || 0)) * (1 - Math.exp(-dt * rt)); if (C[k] > 0.004) { outE[k] = C[k]; key += k + (C[k] * 40 | 0); } }
      if (key !== hd.exK) { hd.exK = key; try { hd.hb.setExpression(outE, true); } catch (e) { } }
      for (let j = 0; j < 2; j++) hd.roll[j] += (hd.rollT[j] - hd.roll[j]) * (1 - Math.exp(-dt * 6)); try { hd.hb.setRoll(cl(hd.roll[0], -1, 1), cl(hd.roll[1], -1, 1)); } catch (e) { }
      hd.tg += (hd.tgT - hd.tg) * (1 - Math.exp(-dt * 4)); try { hd.hb.setTongue(hd.tg, now * 8, 0.4); } catch (e) { }
      try { if (hd.hb.setSway) hd.hb.setSway(hd.sw); } catch (e) { } hd.sw.multiplyScalar(Math.exp(-dt * 3));
    }
  }

  // ================= 特效：魂光精灵 / 魂晶 / 火花 =================
  let DOT = null; const dotTex = () => { if (DOT) return DOT; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return (DOT = new THREE.CanvasTexture(c)); };
  function fxInit(sc) {
    const F = { spr: [], cry: [], sp: [] };
    F.cryM = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.011, 0), new THREE.MeshStandardMaterial({ color: '#ffe28a', emissive: '#ffb020', emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.2 }), 260); F.cryM.count = 0; F.cryM.frustumCulled = false; F.cryM.castShadow = true; sc.add(F.cryM);
    const N = 300, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    F.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.02, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); F.pts.frustumCulled = false; F.pts.renderOrder = 6; sc.add(F.pts); F.N = N;
    for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: '#ffd27a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); s.visible = false; s.renderOrder = 7; sc.add(s); F.spr.push({ s, on: false }); }
    return F;
  }
  function glowS(col, size) { const F = Z.fx, e = F.spr.find(x => !x.on) || F.spr[0]; e.on = true; e.s.visible = true; e.s.material.color.set(col || '#ffd27a'); e.s.material.opacity = 0.9; e.s.scale.setScalar(size || 0.06); e.pos = null; e.fn = null; return e; }
  function glowOff(e) { if (!e) return; e.on = false; e.s.visible = false; }
  function crystals(p, n, big, col) { const F = Z.fx; for (let i = 0; i < n && F.cry.length < 260; i++) F.cry.push({ p: p.clone(), v: new V3((Math.random() - 0.5) * (big ? 1.6 : 0.7), 0.6 + Math.random() * (big ? 1.8 : 0.9), (Math.random() - 0.5) * (big ? 1.4 : 0.6)), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), w: new V3(Math.random() * 9, Math.random() * 9, 0), t: 0, life: 2.2 + Math.random(), s: 0.6 + Math.random() * 0.8 }); if (col) F.cryM.material.emissive.set(col); }
  function sparks(p, n, col, spd) { const F = Z.fx; const c = new THREE.Color(col || '#ffd27a'); for (let i = 0; i < n && F.sp.length < F.N; i++) F.sp.push({ p: p.clone(), v: new V3((Math.random() - 0.5), Math.random() * 0.9 + 0.1, (Math.random() - 0.5)).multiplyScalar(spd || 0.9), t: 0, life: 0.5 + Math.random() * 0.6, c }); }
  const _cc = new THREE.Color(), _q3 = new Q4(), _s3 = new V3(), _m2 = new THREE.Matrix4();
  function updFx(dt) {
    const F = Z.fx;
    for (let i = F.cry.length - 1; i >= 0; i--) { const b = F.cry[i]; b.t += dt; if (b.t >= b.life) { F.cry.splice(i, 1); continue; } b.v.y -= 3.2 * dt; b.p.addScaledVector(b.v, dt); if (b.p.y < 0.01 && b.v.y < 0 && Math.abs(b.p.x) < 0.72 && Math.abs(b.p.z) < 0.45) { b.p.y = 0.01; b.v.y *= -0.38; b.v.x *= 0.7; b.v.z *= 0.7; } b.r.x += b.w.x * dt; b.r.y += b.w.y * dt; }
    F.cryM.count = F.cry.length; F.cry.forEach((b, i) => { _q3.setFromEuler(b.r); const s = Math.min(1, (b.life - b.t) * 2) * b.s; _s3.set(s, s, s); _m2.compose(b.p, _q3, _s3); F.cryM.setMatrixAt(i, _m2); }); F.cryM.instanceMatrix.needsUpdate = true;
    const pos = F.pts.geometry.attributes.position, col = F.pts.geometry.attributes.color; let n = 0;
    for (let i = F.sp.length - 1; i >= 0; i--) { const s = F.sp[i]; s.t += dt; if (s.t >= s.life) { F.sp.splice(i, 1); continue; } s.v.y -= 1.2 * dt; s.p.addScaledVector(s.v, dt); }
    for (const s of F.sp) { const k = 1 - s.t / s.life; pos.setXYZ(n, s.p.x, s.p.y, s.p.z); col.setXYZ(n, s.c.r * k, s.c.g * k, s.c.b * k); n++; } for (let i = n; i < F.N; i++) pos.setXYZ(i, 0, -99, 0); pos.needsUpdate = col.needsUpdate = true;
    for (const e of F.spr) if (e.on && e.fn) { try { e.fn(e, dt); } catch (er) { } }
  }

  // ================= 镜头：机位表 + 硬切 =================
  // 机位 { t: 目标（'h0.face' / 'stage' / V3 / ()=>V3）, az, el, d, fov, roll, dr:{az,el,d,roll,fov}（镜头内漂移）, dur, hand }
  function tgt(t, out) {
    if (typeof t === 'function') return out.copy(t());
    if (t && t.isVector3) return out.copy(t);
    if (typeof t === 'string') { const m = /^h(\d+)\.(\w+)$/.exec(t); if (m) { const hd = Z.hd[+m[1]]; if (hd) return wA(hd, m[2], out); } if (t === 'stage') return out.copy(LOOK); }
    return out.copy(LOOK);
  }
  function cut(s) { Z.shot = Object.assign({ az: 0, el: 0.25, d: 0.9, fov: 40, roll: 0, dr: {} }, s, { t0: Z.t, j: { az: (Math.random() - 0.5) * 0.12, el: (Math.random() - 0.5) * 0.06, roll: (Math.random() - 0.5) * 0.05 } }); Z.camSnap = true; }
  function seat(fov) { cut({ seat: true, fov: fov || 40 }); }
  function placeCam(dt) {
    const s = Z.shot, cam = Z.cam, u = s.dur ? cl((Z.t - s.t0) / s.dur, 0, 1) : cl((Z.t - s.t0) / 4, 0, 1), dr = s.dr || {};
    let pos = _b, look = _a;
    if (s.seat) { pos.copy(SEAT); look.copy(LOOK); }
    else { tgt(s.t, look); if (Z.camSnap || !Z.cf) { Z.cf = (Z.cf || new V3()).copy(look); } else Z.cf.lerp(look, 1 - Math.exp(-dt * 8)); look.copy(Z.cf);
      const az = s.az + s.j.az + (dr.az || 0) * u, el = s.el + s.j.el + (dr.el || 0) * u, d = s.d + (dr.d || 0) * u; pos.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d).add(look); }
    Z.camSnap = false; const hs = 0.0012 + 0.004 * (Z.shk || 0), t = Z.t; pos.x += Math.sin(t * 1.7) * hs + (Math.random() - 0.5) * (Z.shk || 0) * 0.02; pos.y += Math.sin(t * 2.1 + 1) * hs + (Math.random() - 0.5) * (Z.shk || 0) * 0.02;
    cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(look); const roll = (s.roll || 0) + (s.j ? s.j.roll : 0) + (dr.roll || 0) * u; if (roll) cam.rotateZ(roll);
    const fov = cl((s.fov || 40) + (dr.fov || 0) * u, 12, 75); if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld(true);
  }

  // ================= 提示：节拍环 / 抉择 / 指认 / 顺序输入 =================
  const KL = { Space: '空格', KeyF: 'F', KeyJ: 'J', KeyK: 'K', KeyD: 'D', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4' };
  const QV = { perfect: 1, great: 0.8, ok: 0.5, miss: 0, dodge: 1 }, QN = { perfect: '完美', great: '漂亮', ok: '凑合', miss: '失手', dodge: '忍住了' }, QC = { perfect: '#ffe28a', great: '#9fe8a0', ok: '#ffb070', miss: '#ff5a5a', dodge: '#8fd8ff' };
  // o: { key, at(秒后命中), lead(环提前出现), kind:'tap'|'hold'|'mash'|'avoid', hold, n, a: 锚点（同 tgt）, col, lab, silent }
  function ring(o) { const now = Z.t; const r = Object.assign({ kind: 'tap', key: 'Space', lead: 1.0, at: 1.0, col: Z.gm.col || '#ffd27a' }, o); r.t0 = now + Math.max(0, r.at - r.lead); r.tt = now + r.at; r.done = false; r.result = null; r.cnt = 0; r.holding = false; Z.rings.push(r); return r; }
  function rings(list) { const rs = list.map(ring); return { get done() { return rs.every(r => r.done); }, get result() { return rs.map(r => r.result); }, rs }; }
  function judgeR(r, q) { r.done = true; r.result = q; r.v = QV[q] || 0; if (!r.silent) { pop(QN[q], QC[q]); snd(q === 'miss' ? 'bad' : q === 'dodge' ? 'good' : 'tick'); } if (r.on) try { r.on(q, r); } catch (e) { } }
  function ringTick() {
    const now = Z.t;
    for (const r of Z.rings) { if (r.done) continue;
      if (r.kind === 'avoid') { if (now > r.tt + 0.25) judgeR(r, 'dodge'); continue; }
      if (r.kind === 'mash') { if (now > r.tt + (r.hold || 1.2)) judgeR(r, r.cnt >= r.n ? 'perfect' : r.cnt >= r.n * 0.7 ? 'great' : r.cnt >= r.n * 0.4 ? 'ok' : 'miss'); continue; }
      if (r.kind === 'hold' && r.holding) { if (now >= r.tt + r.hold) { r.holding = false; judgeR(r, r.hq || 'great'); } continue; }
      if (now > r.tt + 0.24) judgeR(r, 'miss'); }
    Z.rings = Z.rings.filter(r => !r.done || now - r.tt < 0.5);
  }
  function ringKey(code, down) {
    const now = Z.t; let best = null, bd = 9;
    for (const r of Z.rings) { if (r.done || r.key !== code) continue;
      if (r.kind === 'hold' && r.holding) { if (!down) { const left = r.tt + r.hold - now; r.holding = false; judgeR(r, left < 0.12 ? (r.hq || 'great') : 'ok'); } return true; }
      if (!down) continue;
      if (r.kind === 'mash') { if (now >= r.tt - 0.1) { r.cnt++; snd('tick'); return true; } continue; }
      const d = Math.abs(now - r.tt); if (now >= r.t0 - 0.05 && d < bd) { bd = d; best = r; } }
    if (!best) return false;
    if (best.kind === 'avoid') { if (bd < 0.3) judgeR(best, 'miss'); return true; }
    const q = bd <= 0.07 ? 'perfect' : bd <= 0.13 ? 'great' : bd <= 0.22 ? 'ok' : (now < best.tt ? 'miss' : null); if (!q) return false;
    if (best.kind === 'hold' && q !== 'miss') { best.holding = true; best.hq = q; snd('tick'); return true; }
    judgeR(best, q); return true;
  }
  const _p = new V3();
  function scr(a, out) { tgt(a, _p).project(Z.cam); out.x = (_p.x * 0.5 + 0.5) * innerWidth; out.y = (-_p.y * 0.5 + 0.5) * innerHeight; out.ok = _p.z < 1; return out; }
  const _s = {};
  function drawRings() {
    const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1); if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    g2.setTransform(dpr, 0, 0, dpr, 0, 0); g2.clearRect(0, 0, W, H); const now = Z.t;
    for (const r of Z.rings) { if (now < r.t0 - 0.02) continue; const s = r.a ? scr(r.a, _s) : { x: W / 2, y: H * 0.62, ok: true }; if (!s.ok) continue;
      const age = now - r.tt, R0 = 74, Rm = 26, u = cl(1 - (r.tt - now) / Math.max(0.05, r.lead), 0, 1), col = r.kind === 'avoid' ? '#ff4a4a' : r.col, fade = r.done ? cl(1 - (now - r.tt) / 0.4, 0, 1) : 1;
      g2.globalAlpha = 0.95 * fade; g2.lineWidth = 3; g2.strokeStyle = col; g2.beginPath(); g2.arc(s.x, s.y, Rm, 0, PI * 2); g2.stroke();
      if (!r.done && r.kind !== 'mash' && age < 0) { g2.lineWidth = 2 + 3 * u; g2.globalAlpha = (0.35 + 0.6 * u) * fade; g2.beginPath(); g2.arc(s.x, s.y, Rm + (R0 - Rm) * (1 - u), 0, PI * 2); g2.stroke(); }
      if (r.kind === 'hold' && r.holding) { const k = cl((now - r.tt) / r.hold, 0, 1); g2.globalAlpha = 1; g2.lineWidth = 6; g2.beginPath(); g2.arc(s.x, s.y, Rm + 7, -PI / 2, -PI / 2 + PI * 2 * k); g2.stroke(); }
      if (r.kind === 'mash' && !r.done && age > -0.1) { const k = cl(r.cnt / r.n, 0, 1); g2.globalAlpha = 1; g2.lineWidth = 6; g2.beginPath(); g2.arc(s.x, s.y, Rm + 7, -PI / 2, -PI / 2 + PI * 2 * k); g2.stroke(); }
      g2.globalAlpha = fade; g2.fillStyle = '#000b'; g2.beginPath(); g2.arc(s.x, s.y, Rm - 4, 0, PI * 2); g2.fill(); g2.fillStyle = col; g2.font = '900 16px system-ui'; g2.textAlign = 'center'; g2.textBaseline = 'middle';
      g2.fillText(r.kind === 'avoid' ? '✕' : (r.lab || KL[r.key] || '?'), s.x, s.y + 1); if (r.tag) { g2.font = '700 13px system-ui'; g2.fillStyle = '#fff'; g2.fillText(r.tag, s.x, s.y + Rm + 16); }
      if (r.kind === 'mash' && !r.done) { g2.font = '800 13px system-ui'; g2.fillStyle = '#fff'; g2.fillText(`连按 ${r.cnt}/${r.n}`, s.x, s.y - Rm - 14); }
      if (r.kind === 'hold' && !r.done && !r.holding) { g2.font = '700 12px system-ui'; g2.fillStyle = '#fff'; g2.fillText('按住', s.x, s.y - Rm - 12); } }
    g2.globalAlpha = 1;
  }
  // 抉择：o = { title, opts:[{t,d,v}], time }；返回 { done, result:{ i, v } }
  function choice(o) {
    const P = { done: false, result: null, o, t0: Z.t, time: o.time || 9 }; Z.choice = P; const box = q('.ch'), tq = q('.tq');
    box.innerHTML = o.opts.map((x, i) => `<div class="cd" data-i="${i}" style="--c:${o.col || Z.gm.col}"><div class="k">${i + 1}</div><b>${esc(x.t)}</b><span>${esc(x.d || '')}</span></div>`).join(''); box.classList.remove('hide'); tq.classList.remove('hide');
    q('.ql').textContent = o.title || ''; q('.ql').classList.remove('top'); snd('swish'); return P;
  }
  function answer(i) { const P = Z.choice; if (!P || P.done) return; const x = P.o.opts[i]; if (!x) return; P.done = true; P.result = { i, v: x.v != null ? x.v : 1, x }; q('.ch').querySelectorAll('.cd').forEach((c, j) => c.classList.add(j === i ? 'pick' : 'dim')); snd('tick'); setTimeout(() => { if (Z && Z.choice === P) { Z.choice = null; q('.ch').classList.add('hide'); q('.tq').classList.add('hide'); q('.ql').textContent = ''; } }, 420); }
  function choiceTick() { const P = Z.choice; if (!P || P.done) return; const k = 1 - (Z.t - P.t0) / P.time; q('.tq i').style.width = Math.max(0, k * 100) + '%'; if (k <= 0) { const i = Math.floor(Math.random() * P.o.opts.length); answer(i); P.result.v *= 0.5; P.result.late = true; } }
  // 指认：在头上方挂编号牌；o = { n, time, title, labels? }；返回 { done, result:{ i } }
  function pick(o) { const P = { done: false, result: null, o, t0: Z.t, time: o.time || 8, pick: true }; Z.pickP = P; unsay(); q('.ql').textContent = o.title || ''; q('.ql').classList.add('top'); q('.tq').classList.remove('hide'); const map = o.map || Z.hd.slice(0, o.n).map((h, i) => i); P.map = map; P.labs = map.map((hi, i) => { const d = document.createElement('div'); d.className = 'lab'; d.style.setProperty('--c', Z.gm.col); d.textContent = `${i + 1}${o.noName ? '' : ' · ' + ((o.labels && o.labels[i]) || Z.hd[hi].x.n)}`; root.appendChild(d); return d; }); return P; }
  function pickAns(i) { const P = Z.pickP; if (!P || P.done || i >= P.o.n) return; P.done = true; P.result = { i, h: P.map[i] }; snd('tick'); setTimeout(() => { P.labs.forEach(d => d.remove()); if (Z && Z.pickP === P) { Z.pickP = null; q('.tq').classList.add('hide'); q('.ql').textContent = ''; } }, 300); }
  function pickTick() { const P = Z.pickP; if (!P || P.done) { return; } P.labs.forEach((d, i) => { const hd = Z.hd[P.map[i]]; scr(() => wA(hd, 'crown', _c).add(_b.set(0, 0.05, 0)), _s); d.style.left = _s.x + 'px'; d.style.top = _s.y + 'px'; }); const k = 1 - (Z.t - P.t0) / P.time; q('.tq i').style.width = Math.max(0, k * 100) + '%'; if (k <= 0) { pickAns(Math.floor(Math.random() * P.o.n)); P.result.late = true; } }
  // 顺序输入（合唱）：o = { seq:[0..3], per }；按 1~4 依次重复；返回 { done, result:{ ok, n } }
  function seqIn(o) { const P = { done: false, result: null, o, i: 0, ok: 0, last: Z.t }; Z.seqP = P; q('.tq').classList.remove('hide'); if (o.labels) P.labs = o.labels.map((t, i) => { const d = document.createElement('div'); d.className = 'lab'; d.style.setProperty('--c', Z.gm.col); d.textContent = `${i + 1} · ${t}`; root.appendChild(d); return d; }); return P; }
  function seqKey(i) { const P = Z.seqP; if (!P || P.done) return false; const want = P.o.seq[P.i]; if (P.o.onKey) try { P.o.onKey(i, i === want); } catch (e) { } if (i === want) { P.ok++; P.i++; P.last = Z.t; if (P.i >= P.o.seq.length) endSeq(P); } else endSeq(P, true); return true; }
  function endSeq(P, fail) { P.done = true; P.result = { ok: P.ok, n: P.o.seq.length, fail: !!fail }; Z.seqP = null; q('.tq').classList.add('hide'); if (P.labs) P.labs.forEach(d => d.remove()); }
  function seqTick() { const P = Z.seqP; if (!P || P.done) return; if (P.labs) P.labs.forEach((d, i) => { const hd = Z.hd[i]; if (!hd) return; scr(() => wA(hd, 'crown', _c).add(_b.set(0, 0.05, 0)), _s); d.style.left = _s.x + 'px'; d.style.top = _s.y + 'px'; }); const k = 1 - (Z.t - P.last) / (P.o.per || 2.6); q('.tq i').style.width = Math.max(0, k * 100) + '%'; if (k <= 0) endSeq(P, true); }

  // ================= 剧本运行 =================
  function score(v, w) { Z.pts += cl(v, 0, 1.2) * (w || 1); Z.max += (w || 1); }
  function run() {
    for (let n = 0; n < 40; n++) {
      if (Z.wait > 0) return; if (Z.aw && !Z.aw.done) return;
      const res = Z.aw ? Z.aw.result : undefined; Z.aw = null; let r;
      try { r = Z.gen.next(res); } catch (e) { console.warn('HeadPlay script', e); finish(); return; }
      if (r.done) { finish(); return; } const v = r.value;
      if (typeof v === 'number') Z.wait = v; else if (v && typeof v === 'object' && 'done' in v) Z.aw = v;
    }
  }
  function gradeOf() { const p = Z.max > 0 ? Z.pts / Z.max : 0; return p >= 0.9 ? 'S' : p >= 0.75 ? 'A' : p >= 0.55 ? 'B' : p >= 0.35 ? 'C' : 'D'; }
  function finish() {
    if (!Z || Z.phase === 'res') return; Z.phase = 'res'; unsay(); q('.ch').classList.add('hide'); q('.tq').classList.add('hide'); keys('');
    const g = Z.forceG || gradeOf(), gm = Z.gm, B = BUFF[gm.buff], k = GRADE[g]; grant(gm.buff, g, gm.id);
    let coin = 0; if (gm.coin) { coin = Math.round(gm.coin * k * (1 + 0.4 * ((() => { try { return Loop.R().chap - 1; } catch (e) { return 0; } })()))); try { if (window.Loop && Loop.rOn && Loop.rOn() && Loop.stash) Loop.stash(coin, 'headplay'); else G().addCoins(coin); } catch (e) { } }
    for (const hd of Z.hd) { const c = hd.rec.c; if (!c) continue; c.hpl = c.hpl || {}; c.hpl[gm.id] = { g, t: Date.now(), role: hd.i === 0 ? '主演' : '客串' }; }
    try { G().save && G().save(); } catch (e) { }
    const end = Z.endLine || ''; const r = q('.rs'); r.style.setProperty('--gc', GCOL[g]); r.style.setProperty('--bc', B.col);
    r.innerHTML = `<div class="gr">${g}</div><h3>${esc(gm.n)}<small>${esc(gm.sub)} · ${esc(Z.hd[0].x.n)} 主演</small></h3><div class="ln">${end}</div><div class="st">${(Z.stats || []).map(s => `<div>${s}</div>`).join('')}</div>
<div class="bf"><b>${B.ic} 下一趟出猎：${esc(B.n)}（${g}）</b><span>${esc(B.txt(k))}</span></div>${coin ? `<div class="ex">🔮 +${coin}${window.Loop && Loop.rOn && Loop.rOn() ? '（计入本回合结算）' : ''}</div>` : ''}${Z.revealed && Z.revealed.length ? `<div class="ex">🧠 想起了：${esc(Z.revealed.join('、'))}</div>` : ''}<div class="go2">空格 / Esc / 点击 —— 落幕</div>`;
    setTimeout(() => { if (Z && Z.phase === 'res') { r.classList.add('on'); snd(g === 'S' || g === 'A' ? 'fan' : 'thud'); } }, 500);
    Z.resAt = Z.t; root.classList.remove('play');
  }

  // ================= 开始 / 每帧 / 结束 =================
  function begin(id, o) {
    const gm = BY[id], rec = o && o.rec; if (Z || !gm || !rec || !window.G || !G().renderer) return false; const b = btn(id, rec); if (b.lock) { o.api && o.api.sub && o.api.sub(`<span class="d">${esc(b.why)}。</span>`); return false; }
    const cast = castFor(gm, rec); if (cast.length < gm.heads) return false;
    const bodies = gm.bodies && window.Bodies ? Bodies.pickFor(cast, gm.bodies) : []; if (gm.bodies && bodies.length < gm.bodies) return false;
    ui(); const St = stage(), h = o.h; root.style.setProperty('--c', gm.col || '#ffd27a');
    Z = { gm, o, rec, cast, h, sc: St.sc, cam: St.cam, L: St, t: 0, wall: performance.now(), hd: [], bd: [], bodyIt: bodies, rings: [], wait: 0, aw: null, pts: 0, max: 0, phase: 'load', stats: [], revealed: [], shk: 0, mk: 0, api };
    if (bodies.length) { const z0 = Z; Promise.all(bodies.map(it => Bodies.load(it))).then(rs => { if (Z === z0) z0.bdR = rs; else rs.forEach(r => { try { r.dispose(); } catch (e) { } }); }).catch(e => { console.warn('HeadPlay bodies', e); if (Z === z0) z0.bdR = bodies.map(it => Bodies.fallback(it.bd)); }); }
    Z.fx = fxInit(Z.sc); seat(); window.__pauseMain = true; try { SFX.duck && SFX.duck(true); } catch (e) { }
    const host = document.getElementById('riw'); if (host) host.classList.add('hpon');
    const tt = q('.ttl'); tt.querySelector('small').textContent = `${gm.ic} 首级余兴 · ${gm.sub}`; tt.querySelector('b').textContent = gm.n; tt.querySelector('i').textContent = gm.tag || '';
    tt.querySelector('.cast').innerHTML = cast.map((r, i) => { const x = cx(r); return `<div><em>${i === 0 ? '主演' : gm.roles && gm.roles[i] ? esc(gm.roles[i]) : '客串'}</em>${esc(x.n)}（${esc(x.ri)}）</div>`; }).join('') + bodies.map(it => `<div><em>🧍 身体</em>${esc(Bodies.name(it))}</div>`).join(''); tt.classList.add('on');
    Z.loadQ = cast.slice(); Z.loadT = 0; loop.last = 0; requestAnimationFrame(loop); snd('sting');
    return true;
  }
  function loadStep() { // 每帧建一颗头（不一次性卡住）
    if (Z.loadQ.length) {
      const rec = Z.loadQ.shift(), i = Z.hd.length;
      try {
        let hb, g, temp = true;
        if (i === 0 && Z.h && Z.h.hb && Z.h.g) { hb = Z.h.hb; g = Z.h.g; temp = false; Z.hg0 = { p: g.parent, pos: g.position.clone(), q: g.quaternion.clone() }; }
        else { hb = ModelHeads.create(rec.look); g = new THREE.Group(); hb.group.scale.setScalar(Z.ws || 1.55); g.add(hb.group); }
        if (i === 0) { const s = new V3(); hb.group.getWorldScale(s); Z.ws = Math.abs(s.x) || 1.55; }
        const hd = headObj(rec, hb, g, temp, i); anchors(hd); Z.sc.add(g); g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } }); Z.hd.push(hd);
      } catch (e) { console.warn('HeadPlay head', e); Z.loadQ.length = 0; Z.loadFail = true; }
      return false;
    }
    if (Z.loadFail || Z.hd.length < Z.gm.heads) { abortLoad(); return false; }
    if (Z.bodyIt.length && !Z.bd.length) { if (!Z.bdR) { if (Z.loadT < 5) return false; Z.bdR = Z.bodyIt.map(it => Bodies.fallback(it.bd)); } Z.bd = Z.bdR; for (const b of Z.bd) Z.sc.add(b.g); }
    const rv = Z.gm.reveal || ['name', 'race']; for (const hd of Z.hd) for (const k of (hd.i === 0 ? rv : ['name', 'race'])) { try { if (window.Recall && Recall.reveal && !Recall.known(hd.rec.c, k) && Recall.reveal(hd.rec, k, true) && hd.i === 0) Z.revealed.push((Recall.FK && Recall.FK[k] && Recall.FK[k].n) || k); } catch (e) { } }
    for (const hd of Z.hd) hd.x = cx(hd.rec);
    try { Z.gm.setup(Z.api); } catch (e) { console.warn('HeadPlay setup', e); }
    for (const hd of Z.hd) { hd.snap = true; } updHeads(0, 0);
    try { const R = G().renderer; R.compile(Z.sc, Z.cam); } catch (e) { }
    Z.gen = Z.gm.script(Z.api); return true;
  }
  function abortLoad() { const w = '没凑齐演员——有一颗头怎么也摆不上台。'; try { Z.o.api && Z.o.api.sub && Z.o.api.sub(`<span class="d">${w}</span>`); } catch (e) { } close(true); }
  function loop(ts) {
    if (!Z) return; requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min(0.05, loop.last ? (now - loop.last) / 1000 : 0.016); loop.last = now;
    if (Z.phase === 'load') { Z.loadT += dt; if (Z.loadT > 0.3 && loadStep()) { Z.phase = 'title'; Z.titleT = 0; } render(dt, now / 1000); return; }
    if (Z.phase === 'title') { Z.titleT += dt; if (Z.titleT > 2.4) { Z.phase = 'play'; q('.ttl').classList.remove('on'); root.classList.add('in', 'play'); } }
    Z.t += dt; Z.shk = (Z.shk || 0) * Math.exp(-dt * 6);
    if (Z.phase === 'play') { if (Z.wait > 0) Z.wait -= dt; ringTick(); choiceTick(); pickTick(); seqTick(); run(); }
    if (Z && Z.gm.update && Z.phase !== 'load') try { Z.gm.update(Z.api, dt, Z.t); } catch (e) { if (!Z.uerr) { Z.uerr = 1; console.warn('HeadPlay update', e); } }
    if (!Z) return; render(dt, now / 1000);
  }
  function render(dt, now) {
    try { ModelHeads.tick(now); } catch (e) { }
    for (const b of Z.bd) { try { b.update(dt); } catch (e) { } }
    updHeads(dt, now); updFx(dt); placeCam(dt); Z.L.glow.intensity += ((Z.glowT || 0) - Z.L.glow.intensity) * (1 - Math.exp(-dt * 8));
    const R = G().renderer, post = G().post, cam = Z.cam; if (cam.aspect !== innerWidth / innerHeight) { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
    try { if (post && post.on) post.render(Z.sc, cam); else R.render(Z.sc, cam); } catch (e) { try { R.render(Z.sc, cam); } catch (e2) { } }
    if (Z.phase !== 'load') drawRings();
  }
  function key(e) {
    if (!Z) return false; const down = e.type === 'keydown', c = e.code; e.preventDefault(); e.stopImmediatePropagation();
    if (down && e.repeat) return true;
    if (Z.phase === 'res') { if (down && (c === 'Space' || c === 'Escape' || c === 'Enter' || c === 'KeyF') && Z.t - Z.resAt > 0.8) close(); return true; }
    if (down && c === 'Escape') { if (Z.phase === 'play') { Z.forceG = gradeOf() === 'S' ? 'A' : gradeOf(); if (Z.max < 1) Z.forceG = 'D'; Z.endLine = '你提前喊了「卡」。演员们一动不动——她们本来也动不了。'; finish(); } else close(); return true; }
    if (Z.phase !== 'play') return true;
    const dg = /^Digit([1-4])$/.exec(c) || /^Numpad([1-4])$/.exec(c), di = dg ? +dg[1] - 1 : -1;
    if (down && di >= 0) { if (Z.choice && !Z.choice.done) { answer(di); return true; } if (Z.pickP && !Z.pickP.done) { pickAns(di); return true; } if (Z.seqP) { seqKey(di); return true; } }
    const code = dg ? 'Digit' + dg[1] : c; ringKey(code, down);
    return true;
  }
  function close(silent) {
    if (!Z) return; const z = Z; Z = null; window.__pauseMain = false;
    try { for (const hd of z.hd) { const L0 = hd.rec.look || {}; try { hd.hb.setExpression(L0.ex || {}); hd.hb.setRoll(...(L0.rl || [0, 0])); hd.hb.setTongue((L0.tg || 0) * 0.04, 0, (L0.tg || 0) * 0.3); if (hd.hb.setSway) hd.hb.setSway(new V3()); } catch (e) { }
      if (hd.temp) { if (hd.g.parent) hd.g.parent.remove(hd.g); try { hd.hb.dispose && hd.hb.dispose(); } catch (e) { } }
      else if (z.hg0) { const p = z.hg0.p || G().scene; p.add(hd.g); hd.g.position.copy(z.hg0.pos); hd.g.quaternion.copy(z.hg0.q); hd.g.updateMatrixWorld(true); } }
    } catch (e) { console.warn('HeadPlay close', e); }
    if (z.hd.length === 0 && z.h && z.h.g && !z.h.g.parent) try { G().scene.add(z.h.g); } catch (e) { }
    for (const b of (z.bd || [])) { try { z.sc.remove(b.g); b.dispose(); } catch (e) { } }
    try { z.sc.traverse(o => { if (o.userData && o.userData.own) { o.geometry && o.geometry.dispose(); o.material && o.material.dispose && o.material.dispose(); } }); z.fx.cryM.geometry.dispose(); z.fx.cryM.material.dispose(); z.fx.pts.geometry.dispose(); z.fx.pts.material.dispose(); z.fx.spr.forEach(e => e.s.material.dispose()); (z.own || []).forEach(x => { try { x.dispose(); } catch (e) { } }); } catch (e) { }
    try { SFX.duck && SFX.duck(false); } catch (e) { }
    const host = document.getElementById('riw'); if (host) host.classList.remove('hpon');
    if (root) { const r = root; r.classList.remove('in', 'play'); r.style.transition = 'opacity .35s'; r.style.opacity = 0; setTimeout(() => r.remove(), 380); root = null; }
    try { z.o.api && z.o.api.onEnd && z.o.api.onEnd(z.phase === 'res'); } catch (e) { }
    if (!silent) snd('thud');
  }

  // ================= 给剧本用的 API =================
  const api = {
    get t() { return Z.t; }, get hd() { return Z.hd; }, get x() { return Z.hd.map(h => h.x); }, get gm() { return Z.gm; }, get Z() { return Z; },
    at, rest, ex, cut, seat, say, unsay, pop, banner, flash, keys, meter, score, ring, rings, choice, pick, seqIn, snd, crystals, sparks, glowS, glowOff, bell, wA, fmt, pk, shuf, cl, lerp, sm, eo,
    talk(i, d) { const hd = Z.hd[i]; if (hd) hd.talk = d || 1.2; }, roll(i, a, b) { const hd = Z.hd[i]; if (hd) hd.rollT = [a, b]; }, tongue(i, v) { const hd = Z.hd[i]; if (hd) hd.tgT = v; }, sway(i, x, y, z) { const hd = Z.hd[i]; if (hd) hd.sw.set(x, y, z); },
    direct(i, v) { const hd = Z.hd[i]; if (hd) hd.direct = v !== false; }, setP(i, p, qq) { const hd = Z.hd[i]; if (!hd) return; hd.P.copy(p); if (qq) hd.q.copy(qq); },
    shake(a) { Z.shk = Math.max(Z.shk || 0, a); }, glow(v) { Z.glowT = v; }, curtain(shut) { root.classList.toggle('shut', !!shut); }, stat(s) { Z.stats.push(s); }, endLine(s) { Z.endLine = s; }, grade: () => gradeOf(),
    stage: () => Z.sc, cam: () => Z.cam, get fx() { return Z.fx; }, V3, Q4, PI, BUFF, cx,
    // 身体（R72）：bd[j] = 可摆姿势的无头身体；bx[j] = 它生前的归属文案
    get bd() { return Z.bd; }, get bx() { return Z.bd.map(b => b.x); },
    bodyAt(j, x, y, z, yaw) { const b = Z.bd[j]; if (!b) return; b.g.position.set(x, y, z); b.g.rotation.set(0, yaw || 0, 0); b.g.updateMatrixWorld(true); },
    pose(j, p, rate) { const b = Z.bd[j]; if (b) b.pose(p, rate); },
    btip(j, kind, out) { const b = Z.bd[j]; return b ? b.tip(kind, out || new V3()) : (out || new V3()); },
    attach(i, j, kind, o) { const hd = Z.hd[i], b = Z.bd[j]; if (!hd || !b) return; o = o || {}; hd.att = { b, kind: kind || 'neck', anc: o.anc || (kind === 'hands' ? 'center' : 'cut'), rq: new Q4().setFromEuler(new THREE.Euler(o.pitch || 0, o.yaw || 0, o.roll || 0, 'YXZ')), rqT: null, off: o.off ? new V3(o.off[0], o.off[1], o.off[2]) : null, k: o.dur ? 0 : 1, dur: o.dur || 0.001, arc: o.arc != null ? o.arc : 0.12, p0: hd.P.clone(), q0: hd.q.clone() }; hd.direct = false; },
    attTurn(i, pitch, yaw, roll) { const hd = Z.hd[i]; if (hd && hd.att) hd.att.rqT = new Q4().setFromEuler(new THREE.Euler(pitch || 0, yaw || 0, roll || 0, 'YXZ')); },
    detach(i) { const hd = Z.hd[i]; if (hd) hd.att = null; },
    prop(geo, mat) { const m = new THREE.Mesh(geo, mat && mat.isMaterial ? mat : new THREE.MeshStandardMaterial(Object.assign({ color: '#4a3020', roughness: 0.7 }, mat || {}))); m.userData.own = 1; m.castShadow = true; m.receiveShadow = true; Z.sc.add(m); return m; }
  };
  Object.defineProperty(api, 'pts', { get() { return Z ? Z.pts / Math.max(1, Z.max) : 0; } });
  // ================= F 界面信息 =================
  function cardHTML(rec) {
    if (!on()) return ''; const pend = buffsHTML('pend'), c = rec && rec.c, h = c && c.hpl ? Object.keys(c.hpl).filter(k => BY[k]).map(k => `${BY[k].ic}《${BY[k].n}》${c.hpl[k].role || ''} ${c.hpl[k].g}`).join(' · ') : '';
    if (!pend && !h) return ''; return `<div style="margin-top:10px">${h ? `<div style="font-size:12px;color:#d8b8a0;line-height:1.6">🎪 演出记录：${esc(h)}</div>` : ''}${pend ? `<div style="font-size:12px;letter-spacing:.15em;color:#ffd27a;margin-top:4px">🎪 下一趟余兴祝福</div>${pend}` : ''}</div>`;
  }
  function ids() { return GAMES.map(g => g.id); }
  // F 界面「余兴」面板：全部节目（数字键 / 点击开演）
  function menuHTML(rec) {
    css(); const x = cx(rec), pend = buffsHTML('pend');
    let h = `<div class="hpmh">🎪 首级余兴</div><div class="hpmn">主演：<b>${esc(x.n)}</b>。洞里（和魂库）的其他首级来客串，格罗克亲自配音。每个节目每回合演一次；评级 S~D 决定下一趟出猎的祝福强度。<b>数字键</b>或点击开演。</div>${pend ? `<div style="margin-top:8px;font-size:12px;letter-spacing:.15em;color:#ffd27a">已攒下的祝福（下一趟生效）</div>${pend}` : ''}`;
    GAMES.forEach((gm, i) => { const b = btn(gm.id, rec), B = BUFF[gm.buff], used = usedNow(gm.id);
      h += `<div class="hpm${b.lock ? ' lk' : ''}${used ? ' dn' : ''}" data-hp="${gm.id}" style="--c:${gm.col || '#ffd27a'}"><span class="k">${i + 1}</span><b>${gm.ic} ${esc(gm.n)}<i>${esc(gm.sub)}</i></b><small>${gm.need ? '🏛 ' + esc(needName(gm.need)) : '无需建筑'} · ${gm.heads} 颗首级${gm.bodies ? ` · 🧍 无头身体 ×${gm.bodies}（储物箱里有 ${window.Bodies ? Bodies.count() : 0} 具）` : ''}${gm.coin ? ' · 🔮 有赏' : ''}</small><span class="d">${esc(gm.d)}</span><em>→ 下一趟：${B.ic} ${esc(B.n)}</em>${b.lock ? `<span class="why">🔒 ${esc(b.why)}</span>` : ''}</div>`; });
    return h;
  }
  return { on, reg, GAMES, BY, BUFF, GRADE, ids, btn, begin, key, close, cardHTML, menuHTML, nb, buffList, buffsHTML, cx, fmt, pool, get active() { return !!Z; }, get phase() { return Z ? Z.phase : ''; }, get api() { return api; }, _st: () => st() };
})();
