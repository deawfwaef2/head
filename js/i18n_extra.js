// R40：语言纯净补丁（本 agent；不改 UI agent 的 i18n.js / 生成的 i18n_data.js）。
// ① #credits（被 DOM 翻译跳过）按语言换文案 ② 开场故事（ui.js 的 INTRO，含 <b> 分段，不适合逐节点翻译）整段三语。
window.I18NX = (() => {
  const L = () => (window.I18N && I18N.lang) || localStorage.getItem('soulhead_lang') || 'zh';
  const CRED = {
    en: 'Base head models: pixiv Inc. VRoid samples (CC0 / terms of use), VirtualCast VRM samples (VRM Public License), Godette by SirRichard94 (CC-BY), and VRM models released by 24 VRoid community authors — cropped, mixed and modified.<br>Music: Kevin MacLeod (incompetech.com) CC-BY 4.0 · SFX: Kenney (CC0). See CREDITS.md',
    ja: 'ベース頭部モデル：pixiv Inc. VRoid サンプル (CC0 / 利用規約)、VirtualCast VRM サンプル (VRM Public License)、Godette by SirRichard94 (CC-BY)、および VRoid コミュニティ作者24名が公開した VRM モデル —— トリミング・混成・改変あり。<br>音楽：Kevin MacLeod (incompetech.com) CC-BY 4.0 ・ 効果音：Kenney (CC0)。詳細は CREDITS.md',
  };
  let zhCred = null;
  function credits() { const el = document.getElementById('credits'); if (!el) return; if (zhCred === null) zhCred = el.innerHTML; el.innerHTML = CRED[L()] || zhCred; }
  const INTRO = {
    en: [
      ['🌑 Long ago…', 'The ogre <b>Grok</b> was once the most savage monster in the mountains — until the night he devoured an envoy of the Moon Witch.'],
      ['🌙 The Curse', 'The Witch laid a curse: <b>mortal flesh will never fill your belly again.</b> From then on, Grok could feed only on <b>souls</b>.'],
      ['💀 Lingering Souls', 'He found that the heads he severed kept a faint <b>lingering soul</b> that refused to leave. The stronger the woman, the stronger the soul.<br>Handle, knock and torment these heads and the soul seeps out in pain — condensing into <b>🔮 soul crystals</b>.'],
      ['🧌 Snik', 'A greedy goblin peddler, <b>Snik</b>, has set up a stall in your cave. He buys crystals and sells gear and potions — no questions asked.'],
      ['⚔️ Your Cave', 'Walk to the glowing <b>exit and press E</b> to go hunting; bring heads back and <b>left-click to handle them</b> for crystals; press <b>B</b> to build (every build makes you stronger); <b>Tab</b> shows your stats; <b>F1</b> shows every key.<br>Beware: <b>die outside and everything resets.</b>'],
    ],
    ja: [
      ['🌑 遥か昔……', 'オーガの<b>グロク</b>は、山々で最も凶暴な怪物だった。あの夜、月の魔女の使者を喰らうまでは。'],
      ['🌙 呪い', '魔女は呪いをかけた：<b>人間の肉ではもう腹は満たされない。</b>それ以来、グロクは<b>魂</b>だけを糧とした。'],
      ['💀 残魂', '彼は気づいた。自ら刎ねた首には、去ろうとしない一筋の<b>残魂</b>が宿ることに。強い女ほど、残魂は濃い。<br>首を弄び、叩き、苛むと、残魂は苦しみながら滲み出し——<b>🔮魂晶</b>となって固まる。'],
      ['🧌 スニック', '強欲なゴブリンの行商人<b>スニック</b>が洞窟に店を広げた。魂晶を買い、装備や薬を売る——出どころは訊かない。'],
      ['⚔️ あなたの洞窟', '光る<b>出口で E</b> を押して狩りへ。首を持ち帰り<b>左クリックで弄んで</b>魂晶を得よう。<b>B</b>で建築（建物ごとに強くなる）、<b>Tab</b>でステータス、<b>F1</b>で全キー一覧。<br>ご注意：<b>外で死ぬとすべてが無に帰す。</b>'],
    ],
  };
  const NEXT = { en: ['Continue ▶', 'Begin the Hunt ▶'], ja: ['続ける ▶', '狩りを始める ▶'] };
  function intro(i, last) { const l = L(), a = INTRO[l]; if (!a || !a[i]) return null; return { t: a[i][0], b: a[i][1], btn: NEXT[l][last ? 1 : 0] }; }

  // MOD 管理器里的动态句子（名字已由 mods.js 按语言取好，这里只翻句式）
  if (window.I18N && I18N.rule) {
    const R = I18N.rule, q = (L, a) => L === 'en' ? a[0] : a[1];
    R(/^(\d+) \/ (\d+) 已开启$/, (m, L) => q(L, [m[1] + ' / ' + m[2] + ' enabled', m[1] + ' / ' + m[2] + ' オン']));
    R(/^待应用 (\d+) 项：(.*)$/, (m, L, T) => q(L, ['Pending ' + m[1] + ': ', '適用待ち ' + m[1] + '件：']) + T(m[2]));
    R(/^应用并重新载入 \((\d+)\)$/, (m, L) => q(L, ['Apply & reload (' + m[1] + ')', '適用して再読込 (' + m[1] + ')']));
    R(/^依赖「(.+?)」$/, (m, L) => q(L, ['requires “' + m[1] + '”', '「' + m[1] + '」に依存']));
    R(/^与「(.+?)」冲突$/, (m, L) => q(L, ['conflicts with “' + m[1] + '”', '「' + m[1] + '」と競合']));
    R(/^已关闭「(.+?)」（(.+)）$/, (m, L, T) => q(L, ['Turned off “' + m[1] + '” (', '「' + m[1] + '」をオフにしました（']) + T(m[2]) + q(L, [')', '）']));
    R(/^已开启依赖「(.+?)」$/, (m, L) => q(L, ['Turned on required “' + m[1] + '”', '依存先「' + m[1] + '」をオンにしました']));
    R(/^画风切换为「(.+?)」（与「(.+?)」冲突）$/, (m, L) => q(L, ['Art style switched to “' + m[1] + '” (conflicts with “' + m[2] + '”)', '画風を「' + m[1] + '」に切替（「' + m[2] + '」と競合）']));
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', credits); else credits();
  if (window.I18N && I18N.onChange) I18N.onChange(credits);
  return { credits, intro };
})();
