// 游戏专用句型（需要逐项翻译的组合文字）。通用句型在 i18n.js。
(() => {
  const I = window.I18N; if (!I) return;
  I.rule(/^属性倾向：(.+)$/, (m, L, T) => (L === 'en' ? 'Attribute focus: ' : '属性の傾向：') + m[1].trim().split(/\s+/).map(x => { const k = x.match(/^(.+?)×(\d+)$/); return k ? T(k[1]) + '×' + k[2] : T(x); }).join('  '));
  I.rule(/^≈ ?([\d.]+) ?\/秒$/, (m, L) => '≈ ' + m[1] + (L === 'en' ? ' /s' : ' /秒'));
  // 新手教程（js/tutorial.js）有自己的三语文案：让它跟随全局语言（它的面板不参与 DOM 翻译）
  const syncTut = l => { try { localStorage.setItem('soulhead_tut_lang', l); const G = window.G; if (G && G.S && G.S.tut) G.S.tut.lang = l; } catch (e) { } };
  syncTut(I.lang); I.onChange(syncTut);
})();
