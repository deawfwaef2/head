// R54 MOD stuck_guard（默认开）：自动解除“界面卡住 / 进场卡在加载状态”导致的全场定格
// ① G.uiOpen 为真但屏幕上 5 个采样点都直接点到画布（没有任何面板）连续 3 秒 → G.unstick
// ② 出猎世界 W.busy 卡住（加载框已隐藏、没在死亡/离开）超过 6 秒 → 解除 busy、淡入画面
window.Guard54 = (() => {
  const on = () => !window.Mods || Mods.on('stuck_guard') !== false;
  let uiN = 0, busyT = 0;
  const PTS = [[0.5, 0.5], [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]];
  function bare() {
    const G = window.G, cv = G && G.renderer && G.renderer.domElement; if (!cv || !document.elementsFromPoint) return false;
    for (const [x, y] of PTS) { const top = document.elementsFromPoint(innerWidth * x, innerHeight * y)[0]; if (top && top !== cv && top !== document.body && top !== document.documentElement && top.id !== 'relockHint' && top.id !== 'game') return false; }
    return true;
  }
  function tick() {
    if (!on()) return; const G = window.G; if (!G || !G.playing) { uiN = 0; busyT = 0; return; }
    try {
      if (G.uiOpen && !G.cine && !document.body.classList.contains('sgcine') && !(window.Saga && Saga.cine) && bare()) { if (++uiN >= 3) { uiN = 0; G.unstick && G.unstick('界面已自动复位'); } } else uiN = 0;
      const W = window.Worlds && Worlds.active ? Worlds._W : null;
      if (W && W.busy && !W.dead && W.B && W.dom && W.dom.load && W.dom.load.style.display === 'none' && !document.getElementById('wStory')) { busyT += 1; if (busyT >= 6) { busyT = 0; W.busy = false; const f = document.getElementById('wFade'); if (f) f.style.opacity = 0; console.warn('Guard54: W.busy reset'); } } else busyT = 0;
    } catch (e) { }
  }
  setInterval(tick, 1000);
  return { on, tick };
})();
