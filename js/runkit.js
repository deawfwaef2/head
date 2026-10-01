// R54k MOD run_kit（默认开）：工坊里围绕「章节 × 回合 × 肉鸽 × 月之踪迹」的新道具（材料 + 魂晶合成，大多每回合 / 每章限用）。
window.RunKit = (() => {
  const on = () => (!window.Mods || (Mods.on('run_kit') !== false && Mods.on('run_loop') !== false)) && !!window.Sack && !!window.Loop;
  if (!on() || !Sack.def) return { off: true };
  const G = () => window.G, toast = (t, c, s) => { try { G().toast(t, c, s); } catch (e) { } };
  const R = () => Loop.R(), K = () => { const r = R(); r.rk = r.rk || {}; return r.rk; };
  const once = (k, per, label) => { const r = R(), v = per === 'chap' ? r.chap : r.round; if (K()[k] === v) { toast(`${label}这${per === 'chap' ? '一章' : '一回合'}已经用过了`, '#f99', 2); return false; } K()[k] = v; return true; };
  const refund = id => { try { Sack.stashAdd(Sack.mk(id, 1)); } catch (e) { } };
  const RG = () => window.Rogue && Rogue.on && Rogue.on();
  const D = [
    ['rk_boon', { n: '祝福签', icon: '🎴', rar: 3, desc: '摇出一支签：立刻 +1 次祝福抉择（出发面板挑选）。每回合限用 1 支。', onUse() { if (!RG()) return refund('rk_boon'); if (!once('boon', 'round', '祝福签')) return refund('rk_boon'); Rogue.grant(1, '祝福签'); } }, { dust: 8, gem: 1, bone: 2 }, 300],
    ['rk_reroll', { n: '重抽骨签', icon: '🔁', rar: 1, desc: '把这次祝福抉择的 3 个选项全部重抽（要先有待选的抉择）。', onUse() { if (!RG() || !(Rogue.st().pend > 0)) { toast('现在没有待选的祝福抉择', '#f99', 2); return refund('rk_reroll'); } Rogue.st().offer = null; toast('🔁 祝福选项重抽了——去出发面板看看', '#e8d0ff', 2.4); } }, { bone: 2, dust: 2 }, 40],
    ['rk_oil', { n: '换刃油', icon: '🛢️', rar: 2, desc: '洗掉本局的武器流派，重新从 3 个随机流派里选一个（祝福保留）。每章限用 1 次。', onUse() { if (!RG() || !Rogue.st().arch) return refund('rk_oil'); if (!once('oil', 'chap', '换刃油')) return refund('rk_oil'); const s = Rogue.st(); s.arch = null; s.archOffer = null; toast('🛢️ 刀刃洗干净了——出发面板重新选流派', '#ffd8a0', 3); } }, { herb: 4, iron: 3, dust: 4 }, 200],
    ['rk_incense', { n: '回合香', icon: '🕯️', rar: 2, desc: '点在洞里：下一次回洞的首级结算 ×1.3。每回合限点 1 支。', onUse() { if (!once('inc', 'round', '回合香')) return refund('rk_incense'); R().inc = 0.3; toast('🕯️ 回合香点上了：下次回洞结算 ×1.3', '#ffe0a0', 2.6); } }, { herb: 3, dust: 3, cloth: 2 }, 120],
    ['rk_ward', { n: '护头符', icon: '🧿', rar: 1, desc: '下一次结算时，命运骰塔掷出 1 也不会碎头（只挡一次）。', onUse() { R().ward = 1; toast('🧿 护头符挂上了：下次掷出 1 不碎', '#a8d8ff', 2.4); } }, { bone: 3, cloth: 2, dust: 2 }, 80],
    ['rk_compass', { n: '寻月罗盘', icon: '🧭', rar: 3, desc: '指针总朝着月亮的方向：下一趟出猎必定出现「月之踪迹」（找齐月痕 = 1 条月之线索）。', onUse() { if (!(window.MoonTrail && MoonTrail.on())) return refund('rk_compass'); MoonTrail.promise(); toast('🧭 罗盘的指针开始转了：下一趟必有月之踪迹', '#d8d0ff', 3); } }, { iron: 2, gem: 1, dust: 4 }, 150],
    ['rk_quill', { n: '改命羽书', icon: '🪶', rar: 4, desc: '划掉本局的一条「世道」，随机换成另一条。每章限用 1 次。', onUse() { if (!once('quill', 'chap', '改命羽书')) return refund('rk_quill'); const r = R(), M = Loop.MODS, i = Math.floor(Math.random() * r.mods.length), pool = M.filter(m => !r.mods.includes(m.k)); if (!pool.length) return; const old = M.find(m => m.k === r.mods[i]), nw = pool[Math.floor(Math.random() * pool.length)]; r.mods[i] = nw.k; toast(`🪶 世道改写：${old ? old.n : ''} → <b>${nw.n}</b>（${nw.d}）`, '#e8d0ff', 4.5); } }, { cloth: 4, dust: 10, gem: 2 }, 600],
    ['rk_bait', { n: '驱猎香', icon: '🌫️', rar: 1, desc: '烧掉之后，猎手们闻不到你：宿敌逼近 -50%。', onUse() { try { const n = G().S.nem; if (n) n.p = Math.max(0, (n.p || 0) - 50); } catch (e) { } toast('🌫️ 洞里弥漫着呛人的烟：宿敌逼近 -50%', '#d0c8b8', 2.6); } }, { meat: 3, herb: 2 }, 30],
    ['rk_warrant', { n: '战书', icon: '📯', rar: 2, desc: '把战书钉在擂台门口：本章的 BOSS 等级 -3（每章限用 1 次）。', onUse() { if (!once('war', 'chap', '战书')) return refund('rk_warrant'); R().bdeb = 3; toast('📯 战书送出去了：本章 BOSS 等级 -3', '#ffb0a0', 2.6); } }, { bone: 4, iron: 3, dust: 5 }, 250]
  ];
  for (const [id, d, need, coin] of D) { Sack.def(id, Object.assign({ kind: 'use', st: 5 }, d)); Sack.RECIPES.push({ out: id, n: 1, need, coin, grp: 'run' }); }
  return { D };
})();
