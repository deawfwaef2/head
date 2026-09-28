// 第八轮：隐藏解锁 —— 未解锁的建筑完全不显示、条件保密；达成后弹窗说明「为什么解锁」。
// 存档字段 S.unl = { key: '原因' }。旧存档：已建过的/满足层数的建筑静默解锁，不刷屏。
window.Unlocks = (() => {
  const H = S => S.heads.length, E = S => (S.stats && S.stats.earned) || 0, T = S => (S.stats && S.stats.trips) || 0, P = S => (S.stats && S.stats.pokes) || 0;
  const maxRar = S => S.heads.reduce((m, r) => Math.max(m, r.c.rar), -1);
  // [条件, 原因]
  const R = {
    table: [() => true, ''], pole: [() => true, ''], nest: [() => true, ''], t_str: [() => true, ''], torch: [() => true, ''], skulls: [() => true, ''],
    dresser: [S => H(S) >= 3, '你第一次同时拥有 3 颗首级——你开始在意她们的模样了。'],
    seance: [S => H(S) >= 4, '洞里有了 4 颗首级，夜里你听见残魂在低语。'],
    showcase: [S => maxRar(S) >= 2, '你得到了第一颗「稀有」以上的首级，它值得被好好展示。'],
    bounty: [S => T(S) >= 2, '你已出猎 2 次，赏金猎人开始打听你的名字。'],
    t_agi: [S => T(S) >= 1, '第一次出猎回来，你发现自己太笨重了。'],
    t_con: [S => T(S) >= 3, '出猎 3 次，身上的伤疤告诉你：该练练抗揍了。'],
    brazier: [S => E(S) >= 300, '累计获得 300 魂晶，洞里需要更多火光。'],
    pelt: [S => T(S) >= 2, '你从外面拖回了一张熊皮。'],
    rack: [S => (S.eq.weapon || 0) >= 1, '你换了第一把新武器，旧的得有地方挂。'],
    shroom: [S => H(S) >= 5, '首级渗出的魂力让洞角长出了荧光蘑菇。'],
    chest: [S => E(S) >= 1000, '累计获得 1000 魂晶，战利品需要个箱子。'],
    forge: [S => H(S) >= 6, '6 颗首级挤在一起时，你发现它们的残魂会互相吞噬……'],
    bowling: [S => P(S) >= 150, '你已把玩首级 150 次，手痒想扔点什么。'],
    chess: [S => H(S) >= 8, '你收集了 8 颗首级。地精斯尼克盯着它们，搓着手提议：「来一盘头棋？」'],
    cardtable: [S => H(S) >= 12 && T(S) >= 3, '12 颗首级、3 次出猎——斯尼克掏出了一副油腻的牌：「会玩魂牌吗？」'],
    vault: [S => H(S) >= 40, '洞里的首级超过 40 颗，快放不下了——你决定凿一个冰窖。'],
    altar: [S => S.depth >= 2 && E(S) >= 4000, '洞窟深处，你累计获得的 4000 魂晶唤醒了轮回的祭坛。']
  };
  function cond(k, S) {
    const C = BuildCat.C, d = C[k]; if (!d) return [false, ''];
    const r = R[k];
    const depthOk = !d.depth || S.depth >= d.depth;
    if (r) return [depthOk && r[0](S), r[1] || ''];
    if (d.depth) return [depthOk, `洞窟挖深到了第 ${d.depth} 层，你在新挖开的岩壁里发现了「${d.n}」的灵感。`];
    return [true, ''];
  }
  let S = null, t = 0, queue = [], shown = false;
  function has(k) { const s = window.G && G.S; return !s || !!(s.unl && s.unl[k]); }
  function scan(silent) {
    S = G.S; S.unl = S.unl || {};
    const C = BuildCat.C, fresh = [];
    for (const k in C) {
      if (S.unl[k]) continue;
      const [ok, why] = cond(k, S);
      const owned = (S.builds || []).some(b => b.type === k);
      if (ok || owned) { S.unl[k] = why || '初始可用'; if (!silent && why && !owned) fresh.push(k); }
    }
    if (fresh.length) { queue.push(...fresh); try { G.save(); } catch (e) {} }
  }
  function popup() {
    if (shown || !queue.length || G.uiOpen || G.cine || (window.Seance && Seance.active) || (window.Chess && Chess.active) || (window.Cards && Cards.active)) return;
    const ks = queue.splice(0, 4), C = BuildCat.C;
    shown = true;
    const el = document.createElement('div'); el.className = 'unl-wrap';
    el.innerHTML = `<div class="unl-box"><div class="unl-t">🔓 新的建造灵感</div>${ks.map(k => `<div class="unl-i"><div class="unl-ic">${C[k].icon}</div><div><b>${C[k].n}</b><div class="unl-why">解锁原因：${S.unl[k]}</div><div class="unl-d">${C[k].desc || ''}</div></div></div>`).join('')}<div class="unl-f">按 B 打开建造菜单 · 点击任意处关闭</div></div>`;
    document.body.appendChild(el);
    try { SFX.levelup(); } catch (e) {}
    const close = () => { el.remove(); shown = false; };
    el.addEventListener('mousedown', close); setTimeout(close, 9000);
  }
  function init() {
    const css = document.createElement('style');
    css.textContent = `.unl-wrap{position:fixed;inset:0;z-index:45;display:flex;align-items:flex-start;justify-content:center;padding-top:9vh;background:rgba(0,0,0,.25);animation:unlIn .35s}
    @keyframes unlIn{from{opacity:0}}
    .unl-box{width:min(560px,92vw);background:linear-gradient(170deg,#2c1d10,#170e08);border:2px solid #d8a44a;border-radius:18px;padding:18px 22px;box-shadow:0 0 60px rgba(255,180,60,.35),0 20px 60px #000;color:#f3e2c2;animation:unlPop .45s cubic-bezier(.2,1.6,.4,1)}
    @keyframes unlPop{from{transform:scale(.7) translateY(-20px)}}
    .unl-t{font-size:24px;font-weight:900;color:#ffd27a;margin-bottom:10px;text-shadow:0 0 16px rgba(255,180,60,.6)}
    .unl-i{display:flex;gap:14px;align-items:flex-start;padding:10px 0;border-top:1px solid #4a3420}
    .unl-ic{font-size:40px;line-height:1}.unl-why{color:#ffcf8a;font-size:14px;margin:3px 0}.unl-d{color:#b8a080;font-size:13px}
    .unl-f{margin-top:10px;font-size:12px;color:#8a7458;text-align:center}`;
    document.head.appendChild(css);
    const wait = setInterval(() => {
      if (!window.G || !G.S || !G.HOOK) return; clearInterval(wait);
      scan(true);
      G.HOOK.frame.push(dt => { t -= dt; if (t > 0) return; t = 1.5; if (!G.S.dead) { scan(false); popup(); } });
    }, 200);
  }
  init();
  return { has, scan, R };
})();
