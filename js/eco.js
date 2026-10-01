// R54 MOD eco_gpu（默认开）：降低显卡占用 / 风扇噪音，尽量不改画面
// ① 全局 requestAnimationFrame 限帧：按显示器刷新率整数分频到约 60fps（144Hz→72，165Hz→55，240Hz→60），帧间隔均匀
//    菜单/面板/暂停 30fps · 窗口失焦 15fps · 2 分钟没有任何输入 30fps
// ② 渲染分辨率上限 1.0（高 DPI 屏不再 1.5× 超采样）
// ③ GPU 计时（EXT_disjoint_timer_query_webgl2）：GPU 帧时间长期超过预算（帧间隔的 60%）就逐步降分辨率（最低 0.75），宽裕时升回
// URL：?fps=0 不限帧（测试用），?fps=N 指定上限
window.Eco = (() => {
  const on = () => { try { return !window.Mods || Mods.on('eco_gpu') !== false; } catch (e) { return true; } };
  const QS = new URLSearchParams(location.search), QF = QS.has('fps') ? +QS.get('fps') : null;
  const raf0 = window.requestAnimationFrame.bind(window), caf0 = window.cancelAnimationFrame.bind(window);
  let Q = new Map(), seq = 0, pend = 0, lastRaw = 0, lastRun = 0, refMs = 1000 / 60, tickN = 0;
  const IV = new Float32Array(64); let ivN = 0, ivI = 0;
  let lastInput = performance.now();
  for (const e of ['keydown', 'mousedown', 'mousemove', 'wheel', 'touchstart']) addEventListener(e, () => { lastInput = performance.now(); }, { passive: true, capture: true });

  function busyUI() {
    const G = window.G; if (!G) return true;
    try { if (G.uiOpen || !G.playing) return true; if (window.Mods && Mods.isOpen) return true; } catch (e) { }
    return false;
  }
  function cine() { try { return !!((window.G && G.cine) || (window.DecapCam && DecapCam.active) || document.body.classList.contains('sgcine')); } catch (e) { return false; } }
  function target() {
    if (QF != null) return QF > 0 ? QF : 0;
    if (!on()) return 0;
    if (!document.hasFocus()) return 15;
    if (busyUI()) return 30;
    if (performance.now() - lastInput > 120000 && !cine()) return 30;
    return 60;
  }
  function measure(t) {
    if (lastRaw) { const d = t - lastRaw; if (d > 2 && d < 50) { IV[ivI] = d; ivI = (ivI + 1) & 63; ivN = Math.min(64, ivN + 1); } }
    lastRaw = t;
    if (++tickN % 32 === 0 && ivN >= 16) { const a = Array.from(IV.subarray(0, ivN)).sort((x, y) => x - y); refMs = Math.max(4, Math.min(40, a[Math.floor(a.length * 0.25)])); }
  }
  function pump(t) {
    pend = 0; measure(t);
    const tg = target();
    if (tg > 0) {
      if (t - lastRun > 1000) lastRun = t - 1000;
      const n = Math.max(1, Math.round(1000 / tg / refMs));
      if (t - lastRun < n * refMs - refMs * 0.5) { if (Q.size) pend = raf0(pump); return; }
    }
    lastRun = t;
    const cbs = Q; Q = new Map();
    gpuBegin();
    for (const cb of cbs.values()) { try { cb(t); } catch (e) { console.error(e); } }
    gpuEnd(); gpuPoll(tg || 60);
  }
  window.requestAnimationFrame = function (cb) { const id = ++seq; Q.set(id, cb); if (!pend) pend = raf0(pump); return id; };
  window.cancelAnimationFrame = function (id) { Q.delete(id); };

  // ---------- 分辨率上限 + GPU 计时动态分辨率 ----------
  let R = null, prSet = null, gl = null, ext = null, active = null; const qFree = [], qBusy = [], GPU = [];
  let prWant = 1, prCur = 1, decideT = 0;
  const prCap = () => on() ? Math.min(devicePixelRatio || 1, 1) : Math.min(devicePixelRatio || 1, 1.5);
  function attach(renderer) {
    if (R) return; R = renderer; prSet = renderer.setPixelRatio.bind(renderer);
    renderer.setPixelRatio = function (v) { prWant = v; prCur = Math.min(v, prCap(), dyn); return prSet(prCur); };
    try { gl = renderer.getContext(); ext = gl.getExtension('EXT_disjoint_timer_query_webgl2'); } catch (e) { ext = null; }
    prWant = renderer.getPixelRatio(); prCur = Math.min(prWant, prCap()); prSet(prCur);
  }
  let dyn = 9, lastTg = 0;
  function gpuBegin() { if (!ext || active || !on() || QF === 0) return; try { const q = qFree.pop() || gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); active = q; } catch (e) { ext = null; } }
  function gpuEnd() { if (!active) return; try { gl.endQuery(ext.TIME_ELAPSED_EXT); qBusy.push(active); } catch (e) { } active = null; }
  function gpuPoll(fps) {
    if (!ext || !qBusy.length) return;
    let dis = false; try { dis = gl.getParameter(ext.GPU_DISJOINT_EXT); } catch (e) { }
    while (qBusy.length) {
      const q = qBusy[0]; if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break; qBusy.shift();
      if (!dis) { GPU.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6); if (GPU.length > 90) GPU.shift(); }
      qFree.push(q);
    }
    if (qBusy.length > 8) { qFree.push(...qBusy.splice(0, qBusy.length - 4)); }
    if (fps !== lastTg) { lastTg = fps; GPU.length = 0; }
    const now = performance.now(); if (now < decideT || GPU.length < 30 || !R || busyUI()) return; decideT = now + 1500;
    const a = GPU.slice().sort((x, y) => x - y), med = a[a.length >> 1], budget = 1000 / Math.max(30, Math.min(fps, 60)) * 0.6;
    const cap = Math.min(prWant, prCap()); let next = Math.min(prCur, cap);
    if (med > budget * 1.15) next = Math.max(cap * 0.75, prCur * Math.max(0.85, Math.sqrt(budget / med)));
    else if (med < budget * 0.6) next = Math.min(cap, prCur + 0.05);
    if (Math.abs(next - prCur) >= 0.02) { dyn = next >= cap - 0.01 ? 9 : next; prCur = next; prSet(next); GPU.length = 0; }
  }
  function stats() { const a = GPU.slice().sort((x, y) => x - y); return { on: on(), target: target(), refMs: +refMs.toFixed(2), gpuMs: a.length ? +a[a.length >> 1].toFixed(2) : null, pr: prCur, cap: prCap(), timer: !!ext }; }
  return { on, attach, stats, target, shadowMax: () => (on() ? 2048 : 4096) };
})();
