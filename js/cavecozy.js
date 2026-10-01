// R49e MOD cave_cozy（默认开）：洞穴不再“全黑、封闭”。
// 人类感知依据：①瞻望-庇护（能看远、看到出口与天空，又有顶）②暖色低眩光的火光 + 冷色日光的色温对比 = “有人气、有外面”
// ③纯黑/大面积暗角 = 威胁信号，要抬暗部、减暗角 ④高频随机闪烁 = 不安，改为慢而柔的呼吸 ⑤“湿、滑、霉”的观感会引起厌恶，整体偏干暖。
// 本文件只负责调色（仅洞穴内）；灯光/天窗/光柱/灰尘在 game.js 与 cave.js 里（同一个 MOD 开关）。
window.CaveCozy = (() => {
  'use strict';
  const on = () => !window.Mods || Mods.on('cave_cozy') !== false;
  const COZY = { exposure: 1.3, contrast: 1.06, sat: 1.1, vig: 0.22, grain: 0.02, shadowTint: [1.0, 0.96, 0.92] }; // R54k：以前偏灰白（曝光 1.42），收一点、暖一点、四角稍暗更有“窝”的感觉
  let orig = null, inCave = null;
  function frame() {
    const g = window.G, post = g && g.postFx, P = post && post.P; if (!P) return;
    const cave = !(window.Worlds && Worlds.active) && on();
    if (inCave === cave) { if (cave) for (const k in COZY) if (k !== 'shadowTint' && P[k] !== COZY[k]) P[k] = COZY[k]; return; }
    if (!orig) { orig = {}; for (const k in COZY) orig[k] = Array.isArray(P[k]) ? P[k].slice() : P[k]; }
    const src = cave ? COZY : orig;
    for (const k in COZY) if (k in P || k !== 'grain') P[k] = Array.isArray(src[k]) ? src[k].slice() : src[k];
    inCave = cave;
  }
  const wait = setInterval(() => { if (window.G && G.HOOK) { clearInterval(wait); G.HOOK.frame.push(() => { try { frame(); } catch (e) { } }); } }, 300);
  return { frame, COZY };
})();
