// 第二十五轮：头模包（按 MOD 开关用 document.write 同步插入 <script>，file:// 双击可玩；关掉的包完全不加载 → 启动不变慢）
// 注意：这些 MMD 头（星穹铁道 / 绝区零 / 异环 官方 MMD）原规约禁止二次配布与猎奇用途——仅限私人仓库自用。
// 文件缺失时 <script> 只会 404，游戏照常运行。
(function () {
  var P = window.HEAD_PACKS = {
    pack_hsr: ['HSR_Kafka', 'HSR_Himeko', 'HSR_BlackSwan', 'HSR_Acheron', 'HSR_Jingliu', 'HSR_RuanMei', 'HSR_Aglaea', 'HSR_Castorice', 'HSR_Tingyun', 'HSR_Hysilens', 'HSR_Feixiao', 'HSR_Robin'],
    pack_zzz: ['ZZZ_ZhuYuan', 'ZZZ_JaneDoe', 'ZZZ_TsukishiroYanagi', 'ZZZ_HoshimiMiyabi', 'ZZZ_AstraYao', 'ZZZ_EvelynChevalier', 'ZZZ_VivianBanshee', 'ZZZ_Yixuan', 'ZZZ_Isolde', 'ZZZ_Orchidea', 'ZZZ_Lucia'],
    pack_nte: ['NTE_Hathor', 'NTE_Fadia', 'NTE_Lacrimosa', 'NTE_Jiuyuan', 'NTE_Shinku', 'NTE_Zankou', 'NTE_Blackbird', 'NTE_Alphard', 'NTE_Nanally'],
    // 第二十七轮：经典日系 MMD（あにまさ / YYB / Tda 等大师作品，均为非 CC0 → 仅私人使用）
    pack_voc: ['CLS_MikuAnimasa', 'CLS_MikuYYB10', 'CLS_MikuRacing', 'CLS_MikuVBS', 'CLS_HakuAnimasa', 'CLS_KaitoAnimasa', 'CLS_MeikoAnimasa', 'CLS_IA', 'CLS_Yukari'],
    pack_touhou: ['CLS_Mokou', 'CLS_Kaguya', 'CLS_YakumoRan', 'CLS_YakumoYukari'],
    pack_cls: ['CLS_RemTda', 'CLS_Tohru', 'CLS_2B', 'CLS_Mikasa', 'CLS_Junko', 'CLS_Brahma', 'CLS_QinYYB', 'CLS_LLHonoka', 'CLS_LLEri', 'CLS_LLKotori', 'CLS_LLUmi', 'CLS_LLMaki', 'CLS_LLNozomi']
  };
  var on = function (id) { try { return !window.Mods || Mods.on(id); } catch (e) { return true; } };
  var html = '';
  try { if (window.Mods && Mods.on('cc0_only') !== false) return; } catch (e) {} // R38 CC0 模式：MMD 头包都不是 CC0，不加载
  for (var id in P) if (on(id)) for (var i = 0; i < P[id].length; i++) html += '<script src="models/' + P[id][i] + '.js" onerror="this.remove()"><\/script>';
  if (html) document.write(html);
})();
