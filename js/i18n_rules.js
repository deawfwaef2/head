// 游戏专用句型（需要逐项翻译的组合文字）。通用句型在 i18n.js。
(() => {
  const I = window.I18N; if (!I) return;
  I.rule(/^属性倾向：(.+)$/, (m, L, T) => (L === 'en' ? 'Attribute focus: ' : '属性の傾向：') + m[1].trim().split(/\s+/).map(x => { const k = x.match(/^(.+?)×(\d+)$/); return k ? T(k[1]) + '×' + k[2] : T(x); }).join('  '));
  I.rule(/^≈ ?([\d.]+) ?\/秒$/, (m, L) => '≈ ' + m[1] + (L === 'en' ? ' /s' : ' /秒'));
})();
