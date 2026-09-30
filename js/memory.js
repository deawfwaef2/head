// R49 MOD memory（默认开）：「回忆」——技能点不再只能在天赋树里自己点，而是“唤醒一段记忆”：随机 3 张（回忆之镜建成后 4 张）来自不同流派的记忆卡，三选一。
//   · 卡池 = Talents.canRank(id)==='' 的全部节点（遵守前置 / 层门槛 / 点数），按流派抽不同的流派；没有任何主动技能时，保证至少 1 张是主动技能。
//   · 选中 = Talents.alloc(id)。天赋树界面仍然可用（想精确加点的人继续用）。
//   · 触发：① 出门结算卡关闭后（有空余技能点时自动弹出）② 洞里的「回忆之镜」建筑（E）随时唤醒。③ Tab 菜单里也可手动（Memory.open()）。
//   · 重抽：每次选择 1 次，花魂晶（40×等级×次数）；有回忆之镜时每次选择第 1 次重抽免费。
//   · 回忆之镜（建筑）：用 ornate_mirror_01 + brass_candleholders 两个 CC0 模型，不含程序化模型。
window.Memory = (() => {
  const on = () => !window.Mods || Mods.on('memory');
  const G = () => window.G || window.__game;
  const TD = () => window.TalData, TL = () => window.Talents;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const FLAVOR = {
    blade: ['那一夜，我第一次在雨里听见刀在鸣。', '师父说过：慢，是给还不会快的人留的。', '刀锋擦过脖颈的那一瞬，我忽然明白了“见切”。', '她的剑比我快。那是我第一次输，也是第一次学会。'],
    ward: ['盾牌上的每一道裂痕，都是一个没倒下的夜晚。', '我站在门前，身后是一整座城。', '疼痛会过去。站着，是要记一辈子的。', '有人对我说：别退。所以我没有。'],
    shadow: ['影子比人诚实——它从不假装自己不在。', '我从背后走过去的时候，她甚至在哼歌。', '毒是温柔的。它只是让一切慢下来。', '她回头的那一瞬，我已经不在那里了。'],
    rage: ['血从指缝里流下去，我却觉得很暖。', '疼的时候，我反而看得更清楚。', '有人问我怕不怕死。我说，我怕的是忘了怎么活。', '怒火不是火。是有人替我点起来的灯。'],
    soul: ['月光落在掌心，凉得像一个没说完的名字。', '魂从首级里升起来的时候，是有重量的。', '我听见了她们的低语——不是哭，是在教我。', '星星掉下来的时候，不会有人抬头。'],
    hunt: ['每一个名字，我都记得。这就是我的账本。', '她的悬赏单我读了三遍，上面没写她笑起来的样子。', '猎人与猎物，不过是同一场雨里的两个人。', '我数过：一百零七次。我还没有数完。']
  };
  const TIERN = ['', '记忆碎片', '记忆碎片', '深刻的记忆', '刻骨铭心', '命运的一页'];
  const TIERC = ['', '#b9b4aa', '#7fd07a', '#5fa6ff', '#c27cff', '#ffb347'];
  const pk = a => a[Math.floor(Math.random() * a.length)];
  const left = () => { try { return TL().left().skill; } catch (e) { return 0; } };
  const hasAltar = () => { try { return (G().builds || []).some(b => b.type === 'memory'); } catch (e) { return false; } };
  const fmt = (nd, r) => String(nd.d).replace(/\$(\w+)/g, (m, k) => nd.m && nd.m[k] != null ? +(nd.m[k] * (r + 1)).toFixed(2) : m);

  // ================= 抽卡 =================
  function eligible() {
    const out = []; for (const id in TD().ALL) { let why = ''; try { why = TL().canRank(id); } catch (e) { why = 'x'; } if (!why) out.push(id); } return out;
  }
  function draw(n) {
    const D = TD(), ids = eligible(); if (!ids.length) return [];
    const bySch = {}; for (const id of ids) (bySch[D.ALL[id].school] = bySch[D.ALL[id].school] || []).push(id);
    const schools = Object.keys(bySch).sort(() => Math.random() - 0.5); const picks = [];
    const weigh = id => { const nd = D.ALL[id], r = TL().rank(id); return (r === 0 ? 2 : 1) * (nd.type === 'a' ? 1.5 : 1) * (1 + nd.tier * 0.12); };
    const choose = arr => { let t = arr.reduce((a, id) => a + weigh(id), 0) * Math.random(); for (const id of arr) { t -= weigh(id); if (t <= 0) return id; } return arr[arr.length - 1]; };
    for (const sc of schools) { if (picks.length >= n) break; picks.push(choose(bySch[sc])); }
    // 不够 n 张：同流派补不同节点
    while (picks.length < n) { const rest = ids.filter(id => !picks.includes(id)); if (!rest.length) break; picks.push(choose(rest)); }
    // 没有任何主动技能时，保证 1 张主动
    let hasActive = false; try { hasActive = Object.keys(TL().tal().n).some(id => TD().ALL[id] && TD().ALL[id].type === 'a'); } catch (e) { }
    if (!hasActive && !picks.some(id => D.ALL[id].type === 'a')) { const act = ids.filter(id => D.ALL[id].type === 'a' && !picks.includes(id)); if (act.length) picks[picks.length - 1] = pk(act); }
    return picks.sort(() => Math.random() - 0.5);
  }

  // ================= UI =================
  let root = null, st = null;
  function css() {
    if (css.done) return; css.done = 1; const s = document.createElement('style'); s.textContent = `
#mmRoot{position:fixed;inset:0;z-index:64;display:none;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 45%,rgba(40,24,64,.55),rgba(0,0,0,.92));backdrop-filter:blur(5px);font-family:var(--u-serif,'Noto Serif SC',serif);color:#eee;overflow-y:auto;padding:16px 0}
#mmRoot.on{display:flex;animation:mmIn .6s ease-out}@keyframes mmIn{from{opacity:0}}
#mmRoot .hd{text-align:center;margin:auto 0 16px}
#mmRoot .hd .a{font-size:16px;letter-spacing:.7em;color:#c8b8ff;padding-left:.7em}
#mmRoot .hd .b{font-size:clamp(40px,5.2vw,72px);font-weight:900;letter-spacing:.4em;color:#fff;text-shadow:0 0 50px #8a6aff99;padding-left:.4em;line-height:1.1}
#mmRoot .hd .c{font-size:19px;color:#d8d0f0;letter-spacing:.12em;margin-top:6px}
#mmRoot .hd .c b{color:#ffe28a;font-size:24px}
#mmRoot .cards{display:flex;gap:18px;justify-content:center;align-items:stretch;padding:0 2vw;flex-wrap:wrap}
#mmRoot .cd{position:relative;width:min(270px,21.5vw);min-width:232px;padding:0 0 18px;cursor:pointer;background:linear-gradient(170deg,color-mix(in srgb,var(--c) 22%,#0c0814),#0a0710 70%);box-shadow:inset 0 0 0 1px var(--c),0 18px 60px #000c,0 0 50px color-mix(in srgb,var(--c) 18%,transparent);opacity:0;transform:translateY(40px) rotateY(18deg) scale(.94);animation:mmCard .8s cubic-bezier(.2,.9,.2,1) forwards;transition:transform .25s,box-shadow .25s}
#mmRoot .cd:nth-child(2){animation-delay:.12s}#mmRoot .cd:nth-child(3){animation-delay:.24s}#mmRoot .cd:nth-child(4){animation-delay:.36s}
@keyframes mmCard{to{opacity:1;transform:none}}
#mmRoot .cd:hover{transform:translateY(-10px) scale(1.03);box-shadow:inset 0 0 0 2px var(--c),0 26px 80px #000,0 0 90px color-mix(in srgb,var(--c) 45%,transparent)}
#mmRoot .cd .sc{padding:12px 16px 8px;display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,color-mix(in srgb,var(--c) 35%,transparent),transparent)}
#mmRoot .cd .sc i{font-style:normal;font-size:24px}#mmRoot .cd .sc b{font-size:17px;letter-spacing:.35em;color:var(--c)}#mmRoot .cd .sc em{margin-left:auto;font-style:normal;font-size:15px;color:var(--tc);letter-spacing:.1em;font-weight:800}
#mmRoot .cd .ic{text-align:center;font-size:62px;line-height:1.25;filter:drop-shadow(0 0 20px var(--c))}
#mmRoot .cd .nm{text-align:center;font-size:30px;font-weight:900;color:#fff;letter-spacing:.14em;padding-left:.14em}
#mmRoot .cd .ty{text-align:center;margin:6px 0 12px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
#mmRoot .cd .ty span{font-size:15px;font-weight:800;padding:2px 10px;background:rgba(0,0,0,.5);box-shadow:inset 0 0 0 1px currentColor}
#mmRoot .cd .ef{padding:0 20px;font-size:18px;line-height:1.55;color:#f3ead8;font-weight:600;min-height:28px}
#mmRoot .cd .sk{margin:8px 20px 0;font-size:15px;line-height:1.55;color:#cdbfa6}
#mmRoot .cd .fl{margin:14px 20px 0;padding-top:10px;border-top:1px solid color-mix(in srgb,var(--c) 40%,transparent);font-size:16px;line-height:1.65;color:#c8b8e8;font-style:italic}
#mmRoot .cd .key{position:absolute;top:-14px;left:-14px;width:36px;height:36px;border-radius:50%;background:#0a0710;box-shadow:inset 0 0 0 2px var(--c);text-align:center;line-height:36px;font-size:19px;font-weight:900;color:#fff}
#mmRoot .ft{margin:22px 0 auto;display:flex;gap:18px;align-items:center}
#mmRoot .ft button{font:700 18px var(--u-serif,serif);letter-spacing:.2em;padding:10px 26px;background:rgba(255,255,255,.06);color:#fff;border:1px solid #ffffff55;cursor:pointer}
#mmRoot .ft button:hover{background:rgba(255,255,255,.16)}#mmRoot .ft button[disabled]{opacity:.4;cursor:default}
#mmRoot .ft small{font-size:15px;color:#bdb2d6}
#mmRoot .empty{font-size:22px;color:#d8d0f0;padding:30px}
#mmFlash{position:fixed;inset:0;z-index:65;pointer-events:none;background:radial-gradient(circle,var(--c) 0,transparent 60%);opacity:0}
#mmFlash.on{animation:mmFl 1s ease-out}@keyframes mmFl{0%{opacity:.85}100%{opacity:0}}`;
    document.head.appendChild(s);
  }
  function ensure() {
    css(); if (root) return; root = document.createElement('div'); root.id = 'mmRoot'; document.body.appendChild(root);
    ['mousedown', 'pointerdown', 'wheel', 'contextmenu'].forEach(ev => root.addEventListener(ev, e => e.stopPropagation()));
    root.addEventListener('click', e => { const c = e.target.closest('[data-mm]'); if (c) return pick(+c.dataset.mm); if (e.target.closest('[data-rr]')) return reroll(); if (e.target.closest('[data-x]')) close(); });
  }
  const lvl = () => { try { return RPG.lvOf(G().S.xp).lv; } catch (e) { return 1; } };
  const tok = () => { try { return (G().S.saga && G().S.saga.rr) || 0; } catch (e) { return 0; } };
  const rrCost = () => (tok() > 0 ? 0 : hasAltar() && !st.rr ? 0 : 40 * lvl() * (st.rr + (hasAltar() ? 0 : 1)));
  function render() {
    const D = TD(), L = left(); st.left = L;
    if (!st.cards.length) { root.innerHTML = `<div class="hd"><div class="a">MEMORY</div><div class="b">回 忆</div></div><div class="empty">${L > 0 ? '没有可以唤醒的记忆了——天赋树已经点满。' : '没有多余的技能点。升级、击败霸主和精英可以获得更多。'}</div><div class="ft"><button data-x>返回 ▶</button></div>`; return; }
    const cards = st.cards.map((id, i) => {
      const nd = D.ALL[id], sc = D.SCHOOLS.find(s => s.id === nd.school), r = TL().rank(id), act = nd.type === 'a', sk = D.SK[id], fl = st.fl[id] || (st.fl[id] = pk(FLAVOR[nd.school] || FLAVOR.blade));
      const ef = act ? `习得主动技能「${nd.n}」` : fmt(nd, r);
      const skl = act && sk ? `<div class="sk">⏱ 冷却 ${sk.cd}s · 💧 ${sk.cost}${sk.hp ? ' · 🩸 ' + sk.hp + '%' : ''} · ${esc(sk.kind)}<br>${esc(sk.d)}</div>` : '';
      return `<div class="cd" data-mm="${i}" style="--c:${sc.col};--tc:${TIERC[nd.tier] || '#fff'}"><div class="key">${i + 1}</div><div class="sc"><i>${sc.ic}</i><b>${esc(sc.n)}</b><em>${TIERN[nd.tier] || ''}</em></div><div class="ic">${nd.ic}</div><div class="nm">${esc(nd.n)}</div>
<div class="ty"><span style="color:${act ? '#ffb070' : '#9fe0b0'}">${act ? '主动技能' : r ? `被动 · ${r}→${r + 1} 级` : '被动 · 新习得'}</span><span style="color:${sc.col}">${esc(sc.tag.split(' · ')[0])}</span>${nd.cost > 1 ? `<span style="color:#ffe28a">消耗 ${nd.cost} 点</span>` : ''}</div><div class="ef">${esc(ef)}</div>${skl}<div class="fl">「${esc(fl)}」</div></div>`;
    }).join('');
    const c = rrCost();
    root.innerHTML = `<div class="hd"><div class="a">${hasAltar() ? '回 忆 之 镜' : 'M E M O R Y'}</div><div class="b">回 忆</div><div class="c">唤醒一段记忆　·　可用技能点 <b>${L}</b></div></div><div class="cards">${cards}</div>
<div class="ft"><button data-rr ${c > G().S.coins ? 'disabled' : ''}>🔄 重抽 ${c ? '🔮' + c : (tok() > 0 ? '（重抽券 ×' + tok() + '）' : '（免费）')}</button><button data-x>稍后再想</button><small>按 1 / 2 / 3${st.cards.length > 3 ? ' / 4' : ''} 选择 · Esc 关闭</small></div>`;
  }
  function open(opts) {
    if (!on() || !window.Talents || !window.TalData) return false; ensure();
    if (root.classList.contains('on')) return true;
    if (left() <= 0) { try { G().toast('没有多余的技能点——升级、击败霸主和精英可以获得更多', '#c8b8ff', 2.2); } catch (e) { } return false; }
    st = { cards: draw(hasAltar() ? 4 : 3), rr: 0, fl: {}, opts: opts || {} }; render(); root.classList.add('on');
    try { G().setUI(true); SFX.open && SFX.open(); SFX.page && SFX.page(); } catch (e) { } return true;
  }
  function close() { if (!root || !root.classList.contains('on')) return; root.classList.remove('on'); try { G().setUI(false); G().lockPointer && G().lockPointer(); SFX.close && SFX.close(); } catch (e) { } }
  function reroll() { const c = rrCost(); if (c > G().S.coins) return; if (c) G().addCoins(-c); else if (tok() > 0) G().S.saga.rr--; st.rr++; st.cards = draw(hasAltar() ? 4 : 3); st.fl = {}; render(); try { SFX.page && SFX.page(); } catch (e) { } }
  function flash(col) { let f = document.getElementById('mmFlash'); if (!f) { f = document.createElement('div'); f.id = 'mmFlash'; document.body.appendChild(f); } f.style.setProperty('--c', col); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  function pick(i) {
    const id = st && st.cards[i]; if (!id) return; const D = TD(), nd = D.ALL[id], sc = D.SCHOOLS.find(s => s.id === nd.school);
    if (!TL().alloc(id)) { try { G().toast('这段记忆还唤不醒', '#ff9a8a', 1.4); } catch (e) { } return; }
    flash(sc.col); try { SFX.fanfare && SFX.fanfare(2); } catch (e) { }
    try { G().toast(`${sc.ic} 回忆 · ${nd.n}${nd.type === 'a' ? '（主动技能，已放进技能栏）' : ''}`, sc.col, 2.6); G().save(); } catch (e) { }
    if (left() > 0) { st.cards = draw(hasAltar() ? 4 : 3); st.rr = 0; st.fl = {}; setTimeout(() => root.classList.contains('on') && render(), 650); } else setTimeout(close, 700);
  }
  addEventListener('keydown', e => {
    if (!root || !root.classList.contains('on')) return; if (/^F\d+$/.test(e.code)) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return;
    const m = /^(?:Digit|Numpad)([1-4])$/.exec(e.code); if (m) return pick(+m[1] - 1); if (e.code === 'Escape') close(); if (e.code === 'KeyR') reroll();
  }, true);

  // ================= 回忆之镜（建筑）=================
  function registerBuild() {
    const BC = window.BuildCat; if (!BC || !BC.C || BC.C.memory || !window.Assets) return; const C = BC.C;
    C.memory = {
      cat: 'func', n: '回忆之镜', icon: '🪞', base: 420, grow: 2.0, max: 1, fp: [0.8, 0.4], stat: { soul: 3, ter: 1 }, depth: 1,
      desc: '一面会回答的镜子。对准按 E：唤醒「回忆」——每个技能点可从 4 张（没有镜子是 3 张）来自不同流派的记忆卡里三选一；每次选择第 1 次重抽免费',
      make() {
        const g = new THREE.Group(); const A = Assets;
        if (A.has('ornate_mirror_01')) g.add(A.fit('ornate_mirror_01', { h: 1.75 })); else g.add(BC.box(0.7, 1.6, 0.06, BC.M.dark, 0, 0.85, 0));
        if (A.has('brass_candleholders')) for (const sx of [-0.62, 0.62]) { const h = A.fit('brass_candleholders', { w: 0.42, x: sx, z: 0.12 }); if (h) { g.add(h); g.add(BC.flame(sx, 0.36, 0.12, 0.6, '#b8a0ff')); } }
        return g;
      },
      cols: () => [[-0.45, 0, -0.12, 0.45, 1.8, 0.12]]
    };
    C.wartable = {
      cat: 'func', n: '征途沙盘', icon: '🗺️', base: 260, grow: 2.0, max: 1, fp: [1.4, 0.9], stat: { ter: 2, agi: 1 }, depth: 1,
      desc: '洞里的出征台：按 E 在沙盘上三选一决定下一站（地点卡片、预览图、风险和使者线索都在这里）。摆了沙盘，整个洞穴就有了“出发”的仪式感',
      make() {
        const g = new THREE.Group(); const A = Assets;
        const tb = ['chinese_console_table', 'WoodenTable_01', 'round_wooden_table_02'].find(n => A.has(n));
        if (tb) g.add(A.fit(tb, { w: 1.3 })); else g.add(BC.box(1.3, 0.8, 0.8, BC.M.dark, 0, 0.4, 0));
        const ln = ['Lantern_01', 'wooden_lantern_01'].find(n => A.has(n));
        if (ln) { const h = A.fit(ln, { h: 0.4, x: -0.42, y: 0.8 }); if (h) { g.add(h); g.add(BC.flame(-0.42, 0.98, 0, 0.5, '#ffb04a')); } }
        return g;
      },
      cols: () => [[-0.65, 0, -0.4, 0.65, 0.9, 0.4]]
    };
    if (window.Unlocks && Unlocks.R && !Unlocks.R.memory) Unlocks.R.memory = [S => ((S.stats && S.stats.trips) || 0) >= 1, '第一次出猎归来，你开始频繁想起那些不属于你的记忆——洞里需要一面能回答的镜子。'];
  }
  function initHooks() {
    const w = setInterval(() => {
      if (!window.G || !G.HOOK || !window.BuildCat) return; clearInterval(w); registerBuild();
      G.HOOK.e.push((hit, held, pickup) => { const b = hit && hit.build; if (!b || held || pickup || b.type !== 'memory' || !on()) return false; open({ altar: 1 }); return true; });
      G.HOOK.e.push((hit, held, pickup) => { const b = hit && hit.build; if (!b || held || pickup || b.type !== 'wartable' || !on()) return false; try { if (window.SFX && SFX.open) SFX.open(); UI.openExpedition(); } catch (e) { } return true; });
      G.HOOK.tip.push((hit, held) => { const b = hit && hit.build; if (!b || held || b.type !== 'wartable' || !on()) return null; let h = ''; try { if (window.Saga && Saga.on()) h = ' · ' + Saga.hint(Elites.victoryState()); } catch (e) { } return `<b>🗺️ 征途沙盘</b> · <b>[E]</b> 三选一决定下一站${h}`; });
      G.HOOK.tip.push((hit, held) => { const b = hit && hit.build; if (!b || held || b.type !== 'memory' || !on()) return null; return `<b>🪞 回忆之镜</b>（可用技能点 ${left()}） · <b>[E]</b> 唤醒回忆（4 选 1 · 首次重抽免费）`; });
    }, 400);
  }
  initHooks();
  // 洞里提示：有空余技能点时，屏幕右上角一个小徽标，反引号键（`）唤醒
  let chip = null;
  addEventListener('keydown', e => { if (e.code === 'Backquote' && !e.repeat && on() && G() && G().playing && !G().uiOpen && !(window.Worlds && Worlds.active)) { e.preventDefault(); open({}); } });
  setInterval(() => {
    try {
      if (!on() || !window.Talents || !G() || !G().S) return; const n = left(), show = n > 0 && G().playing && !G().uiOpen && !(window.Worlds && Worlds.active) && !(root && root.classList.contains('on'));
      if (!chip) { css(); chip = document.createElement('div'); chip.style.cssText = 'position:fixed;right:18px;top:96px;z-index:33;pointer-events:none;font:800 17px var(--u-serif,serif);letter-spacing:.12em;color:#fff;padding:8px 16px;background:linear-gradient(270deg,#2a1a4ae0,#2a1a4a00);border-right:3px solid #b8a0ff;text-shadow:0 1px 6px #000;display:none'; document.body.appendChild(chip); }
      chip.style.display = show ? 'block' : 'none'; if (show) chip.innerHTML = `🧠 ${n} 段回忆待唤醒 · 按 <b style="color:#ffe28a">\`</b>`;
    } catch (e) { }
  }, 800);
  // 结算卡关闭后若还有技能点，自动弹出回忆
  function afterSettle() { setTimeout(() => { if (on() && left() > 0 && !(window.Worlds && Worlds.active)) open({ auto: 1 }); }, 500); }
  function grantReroll(n) { const S = G().S; S.saga = S.saga || {}; S.saga.rr = (S.saga.rr || 0) + (n || 1); }
  return { grantReroll, on, open, close, draw, eligible, left, afterSettle, hasAltar, FLAVOR, get st() { return st; } };
})();
