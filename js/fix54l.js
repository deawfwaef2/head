// R54l MOD soft_glow（默认开）：人物「光芒万丈」刺眼——泛光阈值太低（0.9）、强度太高（0.9），皮肤高光和逆光轮廓光都被糊成一片光晕；
// 改成只让真正的高亮（火、魔法、天光）泛光，人物逆光轮廓光减到 40%。
(() => {
  if (window.Mods && Mods.on && Mods.on('soft_glow') === false) return;
  if (window.Master && Master.P) Object.assign(Master.P, { bloomStr: 0.38, bloomThresh: 1.25, bloomKnee: 0.35, flare: 0.012 });
  if (window.CharLight) { try { for (const k in CharLight.ST) CharLight.ST[k].rim *= 0.4; if (CharLight.U && CharLight.U.uCLr) CharLight.U.uCLr.value *= 0.4; } catch (e) { } }
})();
