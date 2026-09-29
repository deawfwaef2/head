// 第九轮：MOD 管理器 —— 每个改动都是可开关的 MOD；处理互斥组 / 依赖 / 冲突。
// 状态存 localStorage 'soulhead_mods'；改动后需重新载入（先自动存档）。
// 用法：Mods.on('forge') → true/false。新 MOD：在 LIST 里加一项，然后在对应代码里用 Mods.on(id) 做开关。
window.Mods = (() => {
  const KEY = 'soulhead_mods';
  // cat: play 玩法 / look 角色外观 / render 画风(互斥组 render) / perf 性能 / asset 模型与材质
  const LIST = [
    // ---------- 画风（互斥：只能选一个） ----------
    { id: 'r_classic', cat: 'render', group: 'render', icon: '🎮', n: '原版渲染', d: '不做后处理，最省性能。', def: true },
    { id: 'r_illust', cat: 'render', group: 'render', icon: '🖌️', n: '插画风', d: '各向异性 Kuwahara 笔触 + 墨线描边 + 纸纹 + 柔光晕染，画面像厚涂插画。', def: false },
    { id: 'r_anime', cat: 'render', group: 'render', icon: '✨', n: '赛璐璐动画', d: '粗描边 + 色阶化光影 + 高饱和 + 高光溢出，像 TV 动画截图。' },
    { id: 'r_water', cat: 'render', group: 'render', icon: '💧', n: '水彩', d: '颜料晕开、边缘积色、纸张颗粒与轻微手绘抖动。' },
    { id: 'r_oil', cat: 'render', group: 'render', icon: '🎨', n: '油画', d: '强 Kuwahara 厚涂笔触 + 画布纹理 + 暖色调。' },
    { id: 'r_film', cat: 'render', group: 'render', icon: '🎞️', n: '暗黑电影', d: '电影调色 + 泛光 + 暗角 + 胶片颗粒 + 轻微色差。' },
    { id: 'r_ink', cat: 'render', group: 'render', icon: '🖋️', n: '水墨', d: '去色 + 墨线 + 宣纸，仅保留血色与魂光的红。' },
    { id: 'outline', cat: 'render', icon: '✏️', n: '额外描边', d: '在任意画风上叠加细墨线（赛璐璐/水墨已自带描边，与之冲突）。', conflicts: ['r_anime', 'r_ink'] },
    { id: 'bloom', cat: 'render', icon: '🌟', n: '魂光泛光', d: '魂光、火焰、稀有光柱发出柔和泛光。', def: false },
    // ---------- 性能 ----------
    { id: 'lod', cat: 'perf', icon: '⚡', n: '万首优化', d: '远处首级自动降级 / 隐藏，休眠首级不再计算物理，支持上万颗首级（冰窖存储）。强烈建议开启。', def: true },
    { id: 'lowspec', cat: 'perf', icon: '🥔', n: '低配模式', d: '关闭所有后处理和发丝摆动，降低分辨率。与所有画风（原版除外）/泛光/发丝微风冲突。', conflicts: ['r_illust', 'r_anime', 'r_water', 'r_oil', 'r_film', 'r_ink', 'bloom', 'breeze', 'outline'] },
    // ---------- 角色外观 ----------
    { id: 'headwear', cat: 'look', icon: '🎀', n: '头饰', d: '14 种精细头饰（蝴蝶结、兔耳、女仆头饰、花冠……），按身份掷骰。', def: true },
    { id: 'makeup', cat: 'look', icon: '🌸', n: '妆容', d: '腮红、泪痣、雀斑。', def: true },
    { id: 'breeze', cat: 'look', icon: '🍃', n: '发丝微风', d: '头发始终有轻微的风动。', def: true },
    { id: 'species', cat: 'look', icon: '🧬', n: '异种族质感', d: '史莱姆娘（半透明果冻）、幽灵、人偶（瓷肌+关节线）、机娘（面板线+发光）、石像、冰晶、暗影等全新材质种族。', def: true },
    { id: 'pupils', cat: 'look', icon: '👁️', n: '异瞳花纹', d: '心形 / 星形 / 竖瞳 / 十字 / 花瓣 / 环形等瞳孔花纹。', def: true },
    { id: 'stars', cat: 'look', icon: '⭐', n: '品质星级', d: '每个魂阶再细分 ★1–★5（下品→极品），产出与展厅分随星级变化。', def: true },
    // ---------- 玩法 ----------
    { id: 'regions', cat: 'play', icon: '🗺️', n: '新地域', d: '追加 8 个新狩猎地点（更长的成长线）与更深的洞窟层。', def: true },
    { id: 'forge', cat: 'play', icon: '⚗️', n: '熔魂炉', d: '三颗首级熔成一颗更高阶的新首级。', def: true },
    { id: 'bowling', cat: 'play', icon: '🎳', n: '魂球道', d: '把首级扔向骷髅瓶，全中 STRIKE 连击。', def: true },
    { id: 'dresser', cat: 'play', icon: '💄', n: '化妆台', d: '给首级换头饰、染发、换表情。需要「头饰」。', def: true, requires: ['headwear'] },
    { id: 'explore3d', cat: 'play', icon: '🌄', n: '第一人称出猎', d: '出洞后在 3D 地区里沿路前进：路上站着真实的角色，可以交谈、放过或偷袭；地区霸主（BOSS）会随机现身。关闭则回到“点击 60 次”的文字旅途。', def: true },
    { id: 'chess', cat: 'play', icon: '♟️', n: '头棋殿', d: '首级当棋子，和斯尼克下棋或同屏双人。', def: true },
    { id: 'rebirth', cat: 'play', icon: '♻️', n: '轮回祭坛', d: '献祭一世换永久魂核天赋。', def: true },
    { id: 'thief', cat: 'play', icon: '👻', n: '盗魂灵入侵', d: '盗魂灵定期来偷首级，左键打散。', def: true },
    { id: 'surge', cat: 'play', icon: '🌊', n: '魂潮', d: '随机 20 秒全产出 ×3。', def: true },
    { id: 'ach', cat: 'play', icon: '🏅', n: '成就', d: '28 个跨轮回成就（J 键）。', def: true },
    { id: 'echo', cat: 'play', icon: '💭', n: '残响气泡', d: '相邻首级偶尔浮现记忆碎片，并获得 ×2 产出。', def: true },
    { id: 'film', cat: 'play', icon: '🎬', n: '电影模式', d: 'P 键自由飞行镜头。', def: true },
    { id: 'unlocks', cat: 'play', icon: '🔒', n: '隐藏解锁', d: '未解锁建筑不显示，达成条件后弹窗说明。关闭则全部按层数解锁。', def: true }
  ];
  const BY = {}; LIST.forEach(m => BY[m.id] = m);
  const BUILDS = { forge: ['forge'], bowling: ['bowling'], dresser: ['dresser'], chess: ['chess'], rebirth: ['altar'] };
  let st = {};
  try { st = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  // 第十轮：画风 MOD 冻结不再维护，默认回原版且关泛光（减少开局卡顿）；旧存档迁移一次
  if (!st.__v || st.__v < 2) { for (const m of LIST) if (m.group === 'render') st[m.id] = (m.id === 'r_classic'); st.bloom = false; st.__v = 2; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  for (const m of LIST) if (st[m.id] === undefined) st[m.id] = !!m.def;
  // 修正非法状态（互斥组恰好一个；冲突；依赖）
  function normalize() {
    const groups = {};
    for (const m of LIST) if (m.group) (groups[m.group] = groups[m.group] || []).push(m);
    for (const g in groups) { const on = groups[g].filter(m => st[m.id]); if (on.length !== 1) { groups[g].forEach(m => st[m.id] = false); st[(on[0] || groups[g].find(m => m.def) || groups[g][0]).id] = true; } }
    for (const m of LIST) if (st[m.id]) for (const c of m.conflicts || []) if (st[c]) { if (BY[c].group) { st[m.id] = false; } else st[c] = false; }
    for (const m of LIST) if (st[m.id] && (m.requires || []).some(r => !st[r])) st[m.id] = false;
  }
  normalize();
  const boot = JSON.stringify(st); // 本次载入时生效的状态
  const bootSt = JSON.parse(boot);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  // 开关 + 自动解决冲突；返回被连带改动的说明
  function set(id, v) {
    const m = BY[id]; if (!m) return [];
    const notes = [];
    const off = (k, why) => { if (st[k]) { st[k] = false; notes.push(`已关闭「${BY[k].n}」（${why}）`); for (const o of LIST) if ((o.requires || []).includes(k)) off(o.id, `依赖「${BY[k].n}」`); } };
    if (v) {
      if (st[id]) return notes;
      for (const r of m.requires || []) if (!st[r]) { notes.push(`已开启依赖「${BY[r].n}」`); notes.push(...set(r, true)); }
      if (m.group) for (const o of LIST) if (o.group === m.group && o.id !== id && st[o.id]) { st[o.id] = false; }
      for (const c of m.conflicts || []) if (st[c]) { if (BY[c].group) { const fb = LIST.find(o => o.group === BY[c].group && !(m.conflicts || []).includes(o.id)); st[c] = false; if (fb) { st[fb.id] = true; notes.push(`画风切换为「${fb.n}」（与「${m.n}」冲突）`); } } else off(c, `与「${m.n}」冲突`); }
      for (const o of LIST) if (st[o.id] && (o.conflicts || []).includes(id)) off(o.id, `与「${m.n}」冲突`);
      st[id] = true;
    } else {
      if (!st[id]) return notes;
      if (m.group) { const fb = LIST.find(o => o.group === m.group && o.id === 'r_classic') || LIST.find(o => o.group === m.group && o.id !== id); return set(fb.id, true); }
      st[id] = false;
      for (const o of LIST) if ((o.requires || []).includes(id)) off(o.id, `依赖「${m.n}」`);
    }
    save(); return notes;
  }
  const on = id => !!bootSt[id];

  // 在游戏构建前调用：移除被关闭 MOD 的建筑 / 功能
  function apply() {
    const C = window.BuildCat && BuildCat.C;
    if (C) for (const id in BUILDS) if (!on(id)) for (const k of BUILDS[id]) delete C[k];
    if (!on('unlocks') && window.Unlocks) Unlocks.has = () => true;
  }

  // ---------------- 管理器界面 ----------------
  const CATN = { render: '🖼️ 画风渲染（只能选一个画风）', perf: '⚡ 性能', look: '🧬 角色外观', play: '🎲 玩法', asset: '🏛️ 模型与材质' };
  let box = null;
  function css() {
    if (document.getElementById('modcss')) return;
    const s = document.createElement('style'); s.id = 'modcss';
    s.textContent = `#modbox{position:fixed;inset:0;z-index:60;background:rgba(6,3,8,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:system-ui,'PingFang SC','Microsoft YaHei',sans-serif}
    #modbox .mb{width:min(860px,95vw);max-height:90vh;overflow:auto;background:linear-gradient(160deg,#221820,#120b10);border:1px solid #6a4a5a;border-radius:18px;padding:18px 22px;color:#f3e6ea}
    #modbox h2{margin:0 0 4px;font-size:24px}#modbox .sub{color:#c9a9b8;font-size:13px}
    #modbox h3{margin:16px 0 8px;font-size:15px;color:#ffc8dc}
    #modbox .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
    #modbox .mod{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid #4a3440;border-radius:12px;background:#1c1318;cursor:pointer;transition:border-color .15s,background .15s}
    #modbox .mod:hover{border-color:#8a5a70}#modbox .mod.on{border-color:#ff7aa8;background:#2e1824}
    #modbox .mod .ic{font-size:22px;line-height:1}#modbox .mod b{font-size:14px}#modbox .mod small{display:block;color:#c9a9b8;font-size:12px;line-height:1.35;margin-top:2px}
    #modbox .tg{margin-left:auto;flex:none;width:38px;height:22px;border-radius:11px;background:#3a2a32;position:relative;transition:background .15s}
    #modbox .tg:after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#aaa;transition:left .15s,background .15s}
    #modbox .on .tg{background:#b0306a}#modbox .on .tg:after{left:19px;background:#fff}
    #modbox .note{min-height:20px;margin-top:10px;font-size:13px;color:#ffd27a}
    #modbox .bar{display:flex;gap:10px;justify-content:flex-end;margin-top:12px;position:sticky;bottom:-18px;background:#120b10;padding:10px 0}
    #modbox button{border:1px solid #6a4a5a;background:#2e1f28;color:#f3e6ea;border-radius:11px;padding:9px 16px;font-size:14px;cursor:pointer}
    #modbox button.pri{background:linear-gradient(135deg,#7a2e50,#4a1a60);border-color:#ff9ac8;font-weight:700}
    #modbox .chg{color:#9adfff;font-size:12px;margin-left:6px}`;
    document.head.appendChild(s);
  }
  function open() {
    css(); if (box) box.remove();
    if (document.pointerLockElement) document.exitPointerLock();
    if (window.G && G.setUIOpen) G.setUIOpen(true);
    box = document.createElement('div'); box.id = 'modbox';
    const changed = JSON.stringify(st) !== boot;
    const cats = ['render', 'perf', 'look', 'play'];
    box.innerHTML = `<div class="mb"><h2>🧩 MOD 管理</h2><div class="sub">每个改动都可单独开关。冲突会自动处理（画风只能选一个；低配模式会关掉后处理类 MOD；依赖项会连带开关）。修改后点「应用并重新载入」（会先自动存档）。</div>
      ${cats.map(c => `<h3>${CATN[c]}</h3><div class="grid">${LIST.filter(m => m.cat === c).map(m => `<div class="mod ${st[m.id] ? 'on' : ''}" data-id="${m.id}"><div class="ic">${m.icon}</div><div><b>${m.n}</b>${!!st[m.id] !== !!bootSt[m.id] ? '<span class="chg">待应用</span>' : ''}<small>${m.d}${m.requires ? `<br>依赖：${m.requires.map(r => BY[r].n).join('、')}` : ''}${m.conflicts && !m.group ? `<br>冲突：${m.conflicts.map(r => BY[r].n).join('、')}` : ''}</small></div><div class="tg"></div></div>`).join('')}</div>`).join('')}
      <div class="note" id="modnote">${box._note || ''}</div>
      <div class="bar"><button data-a="def">恢复默认</button><button data-a="close">${changed ? '暂不应用' : '关闭'}</button><button class="pri" data-a="apply" ${changed ? '' : 'disabled style="opacity:.45"'}>应用并重新载入</button></div></div>`;
    box.addEventListener('click', e => {
      const md = e.target.closest('.mod');
      if (md) { const id = md.dataset.id; const notes = set(id, !st[id]); const n = notes.join('；'); open(); const nt = document.getElementById('modnote'); if (nt) nt.textContent = n; return; }
      const a = e.target.closest('button'); if (!a) return;
      if (a.dataset.a === 'close') close();
      else if (a.dataset.a === 'def') { for (const m of LIST) st[m.id] = !!m.def; normalize(); save(); open(); }
      else if (a.dataset.a === 'apply') { save(); try { if (window.G) G.save(); } catch (er) {} location.reload(); }
    });
    document.body.appendChild(box);
  }
  function close() { if (box) box.remove(); box = null; if (window.G && G.setUIOpen) G.setUIOpen(false); }
  addEventListener('keydown', e => {
    if (e.code === 'KeyO' && !e.repeat && !box && window.G && G.playing && !G.uiOpen) { e.preventDefault(); open(); }
    else if (box && e.code === 'Escape') { e.preventDefault(); close(); }
  });
  return { LIST, on, set, apply, open, close, get state() { return st; }, get boot() { return bootSt; } };
})();
