// R54n MOD async_shaders：着色器异步编译。lib/three.min.js 已改为链接后不立刻查询 uniform（与 r151+ 相同），
// 配合 KHR_parallel_shader_compile：compile() 只发起编译不阻塞主线程，wait() 轮询完成状态，加载画面/游戏不再整屏冻结。
window.ShaderQ = (() => {
  const on = () => !window.Mods || Mods.on('async_shaders') !== false;
  let ext;
  const R = () => window.G && G.renderer;
  function hasExt(r) { if (ext === undefined) ext = r.getContext().getExtension('KHR_parallel_shader_compile') || null; return !!ext; }
  function pending(r) {
    r = r || R(); if (!r || !hasExt(r)) return 0; const gl = r.getContext(); let n = 0;
    for (const p of r.info.programs) if (!p.__qd) { if (gl.getProgramParameter(p.program, 0x91B1)) p.__qd = 1; else n++; }
    return n;
  }
  // 模拟 Master 后处理的离屏状态（与 Foe.warm 相同），编出真正会用到的变体
  function compile(r, sc, cam) {
    r = r || R(); if (!r || !sc || !cam) return; const post = window.G && G.post, viaRT = !!(post && post.on), tm = r.toneMapping, rt0 = r.getRenderTarget();
    try { if (viaRT) { compile.rt = compile.rt || new THREE.WebGLRenderTarget(16, 16, { depthBuffer: true }); r.toneMapping = THREE.NoToneMapping; r.setRenderTarget(compile.rt); } r.compile(sc, cam); }
    catch (e) { console.warn('ShaderQ.compile', e); } finally { r.toneMapping = tm; r.setRenderTarget(rt0); }
  }
  function wait(r, onProg, maxMs) {
    r = r || R(); const t0 = performance.now(), lim = maxMs || 90000; let n0 = 0, calm = 0;
    return new Promise(res => { const f = () => { const n = pending(r); n0 = Math.max(n0, n); if (onProg) try { onProg(n0 ? 1 - n / n0 : 1, n); } catch (e) { }
      calm = n ? 0 : calm + 1; if (calm >= 2 || performance.now() - t0 > lim) return res(); setTimeout(f, 40); }; setTimeout(f, 0); });
  }
  async function ready(r, sc, cam, onProg, maxMs) { r = r || R(); if (!on() || !r) return; compile(r, sc, cam); await wait(r, onProg, maxMs); }
  return { on, compile, wait, ready, pending, get async() { const r = R(); return on() && !!r && hasExt(r); } };
})();
