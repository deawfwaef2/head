// 魂首窟 · UI3A 增强层（UI Agent 独占，第十九轮）
// 纯表现层：只读 G / SFX / DOM，不修改玩法状态。MOD 'ui3a' 关闭时（body 无 .ui3a 类）整个模块不启动。
// 内容：SVG 图标替换 emoji · 点击/悬停反馈音 · 粒子画布 · 菜单余烬 · HUD 血条残影/魂晶增量 · 受击/低血反馈 · 聚光灯卡片 · 抽卡爆粒子
window.UI3A = (() => {
  if (!document.body.classList.contains('ui3a')) return { off: true };
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ------------------------------------------------------------------ 图标（24×24 线稿，手写 SVG，属于 UI 元素）
  const P = {
    crystal: '<path d="M12 2.5 19 8.5 16.5 20.5H7.5L5 8.5Z"/><path d="M5 8.5H19M12 2.5 9.5 8.5 12 20.5 14.5 8.5Z"/>',
    crown: '<path d="M3.5 18.5h17M4.5 18.5 3 8l5 4 4-7 4 7 5-4-1.5 10.5"/><circle cx="12" cy="4.2" r=".6"/>',
    swords: '<path d="M4 20 18.5 5.5M18.5 5.5H14M18.5 5.5V10M20 20 5.5 5.5M5.5 5.5H10M5.5 5.5V10M3 17l4 4M21 17l-4 4"/>',
    sparkle: '<path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7ZM19 16.5c.2 1.5.9 2.2 2.4 2.4-1.5.2-2.2.9-2.4 2.4-.2-1.5-.9-2.2-2.4-2.4 1.5-.2 2.2-.9 2.4-2.4Z"/>',
    skull: '<path d="M12 3a8 8 0 0 0-8 8c0 3 1.5 4.8 3.5 5.8V20h9v-3.2c2-1 3.5-2.8 3.5-5.8a8 8 0 0 0-8-8Z"/><circle cx="9" cy="11.5" r="1.7"/><circle cx="15" cy="11.5" r="1.7"/><path d="M10.5 20v-2.5M13.5 20v-2.5"/>',
    drop: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z"/><path d="M9.5 15a2.6 2.6 0 0 0 2 2.4"/>',
    heart: '<path d="M12 20s-8-4.9-8-11a4.5 4.5 0 0 1 8-2.6A4.5 4.5 0 0 1 20 9c0 6.1-8 11-8 11Z"/>',
    flask: '<path d="M10 3h4M11 3v5.5a7 7 0 1 0 2 0V3M8 15h8"/>',
    vial: '<path d="M9 3h6M10 3v6.5L5.5 19a1.6 1.6 0 0 0 1.4 2.3h10.2a1.6 1.6 0 0 0 1.4-2.3L14 9.5V3M8 15h8"/>',
    chair: '<path d="M7 3v9M17 3v9M7 12h10M6 12l-1 9M18 12l1 9M7 6h10"/>',
    spiral: '<path d="M12 12a1.5 1.5 0 0 1 3 0 3.5 3.5 0 0 1-7 0 5.5 5.5 0 0 1 11 0 7.5 7.5 0 0 1-15 0"/>',
    pawn: '<circle cx="12" cy="7" r="3"/><path d="M9.5 11.5c.5 3-1 4.5-2.5 8h10c-1.5-3.5-3-5-2.5-8M6 20.5h12"/>',
    ogre: '<path d="M5 4c1 2 1.5 3.5 2.5 4.5M19 4c-1 2-1.5 3.5-2.5 4.5M6 9h12v6a6 6 0 0 1-12 0Z"/><path d="M9 13h.01M15 13h.01M9.5 17.5l1 1 1.5-1 1.5 1 1-1"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5"/>',
    magnifier: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 6 6"/>',
    recycle: '<path d="M4 12a8 8 0 0 1 13.5-5.8M20 12a8 8 0 0 1-13.5 5.8M17.5 3v3.5H14M6.5 21v-3.5H10"/>',
    walker: '<circle cx="13" cy="4.5" r="2"/><path d="M12 8.5 9 12l3 3v6M12 8.5l3 3 3 1M9 12l-3 2M12 15l3.5 2"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.7 7.5 9 4.3-1.3 7.5-4.5 7.5-9V6Z"/><path d="M12 7v10"/>',
    frame: '<rect x="3.5" y="4.5" width="17" height="15" rx="1"/><path d="m5 17 4.5-5 3.5 3.5 2.5-2.5L19 17"/><circle cx="15.5" cy="9" r="1.3"/>',
    flower: '<circle cx="12" cy="9" r="2"/><path d="M12 7c0-2 1-3.5 2-4 .5 2-.2 3.7-2 4ZM12 7C12 5 11 3.5 10 3c-.5 2 .2 3.7 2 4ZM12 11v10M12 17c-3 0-4.500-1.500-5-3.500M12 15c2.500 0 4-1 4.500-3"/>',
    scroll: '<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4Zm0 0a2 2 0 0 0-2 2v1h2M9 9h7M9 12.5h7M9 16h4"/>',
    book: '<path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2ZM12 6v14"/>',
    books: '<path d="M5 4h4v16H5ZM9 6h4v14H9ZM14 8l4-1 3 12-4 1ZM5 8h4M9 10h4"/>',
    mirror: '<ellipse cx="12" cy="9.5" rx="6" ry="7"/><path d="M12 16.5V21M8.5 21h7M9 7.5c.5-1 1.3-1.6 2.3-1.8"/>',
    flame: '<path d="M12 21c-4 0-6.5-2.8-6.5-6.2 0-3.6 3-5.6 4-9.3 1.7 1.2 2.7 2.8 3 4.5 1-.7 1.5-1.8 1.5-3 2.2 2 3.5 4.4 3.5 7.6 0 3.4-2.5 6.4-5.5 6.4Z"/><path d="M12 21c-1.700 0-2.800-1.200-2.800-2.800 0-1.700 1.400-2.500 2.800-4.400 1.400 1.700 2.800 2.700 2.800 4.400 0 1.600-1.100 2.800-2.800 2.800Z"/>',
    candle: '<path d="M12 2.5c1.500 1.800 2 3 2 4a2 2 0 0 1-4 0c0-1 .5-2.200 2-4ZM9 10h6v11H9ZM7 21h10"/>',
    basket: '<path d="M3.5 9h17l-1.700 10.500H5.200ZM8 9l3-5M16 9l-3-5M8 13v3.500M12 13v3.500M16 13v3.500"/>',
    hole: '<ellipse cx="12" cy="14" rx="8.500" ry="4.500"/><path d="M6.500 11c1-2 3-3 5.500-3s4.500 1 5.500 3"/>',
    bow: '<path d="M12 12 4 7v10ZM12 12l8-5v10ZM10.500 13.500 8 20M13.500 13.500 16 20"/><circle cx="12" cy="12" r="1.600"/>',
    warn: '<path d="M12 3.500 22 20H2Z"/><path d="M12 10v5M12 17.500v.5"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    bolt: '<path d="M13 2.500 5 13.500h6l-1 8 8-11h-6Z"/>',
    speech: '<path d="M4 5h16v11H11l-4.500 4v-4H4Z"/>',
    dagger: '<path d="M20 4 10 14M20 4l-1 5-4 4-4-4 4-4ZM7.500 13.500l3 3M7 14 4 20l6-3"/>',
    wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8a2.500 2.500 0 1 1-2.500 2.500"/>',
    star: '<path d="m12 3 2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100-4.400-4.300 6.100-.9Z"/>',
    columns: '<path d="M3 9 12 4l9 5ZM5 9v9M9.500 9v9M14.500 9v9M19 9v9M3 20h18"/>',
    map: '<path d="m3.500 6 5.500-2 6 2 5.500-2v14l-5.500 2-6-2-5.500 2ZM9 4v14M15 6v14"/>',
    ghost: '<path d="M5 20V11a7 7 0 0 1 14 0v9l-2.300-2-2.400 2-2.300-2-2.300 2-2.400-2Z"/><path d="M9.500 11h.01M14.500 11h.01"/>',
    medal: '<circle cx="12" cy="14.500" r="5.500"/><path d="m8.500 10-3-7h5l2 5M15.500 10l3-7h-5l-2 5"/>',
    cabinet: '<rect x="4.500" y="3.500" width="15" height="17" rx="1"/><path d="M12 3.500v17M9.500 12v1.500M14.500 12v1.500"/>',
    vase: '<path d="M9 3h6M10 3v3c-3 1-5 4-5 8 0 4 3 7 7 7s7-3 7-7c0-4-2-7-5-8V3M7 12h10"/>',
    barrel: '<path d="M6 4h12c1.500 3 1.500 13 0 16H6c-1.500-3-1.500-13 0-16ZM6.500 8h11M6.500 16h11"/>',
    inbox: '<path d="M12 3v11M7.500 10 12 14.500 16.500 10M4 15v5h16v-5"/>',
    outbox: '<path d="M12 15V4M7.500 8 12 3.500 16.500 8M4 15v5h16v-5"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0ZM7 6H4c0 3 1 4.500 3 5M17 6h3c0 3-1 4.500-3 5M12 14v4M8 21h8M9.500 18h5"/>',
    note: '<path d="M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3ZM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3Z"/>',
    mute: '<path d="M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3ZM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3ZM3 3l18 18"/>',
    puzzle: '<path d="M10 4a2 2 0 1 1 4 0v2h4v4h-2a2 2 0 1 0 0 4h2v4h-4v-2a2 2 0 1 0-4 0v2H6v-4h2a2 2 0 1 0 0-4H6V6h4Z"/>',
    bag: '<path d="M9 3h6l-1.500 3h-3ZM10.500 6C6 8.500 4.500 13 5.500 17c.5 2.500 3 4 6.500 4s6-1.500 6.500-4c1-4-.5-8.500-5-11M12 11v6"/>',
    hammer: '<path d="m14 5 5 5-2 2-5-5ZM12 7 4 15l3 3 8-8M4 21l3-3"/>',
    burst: '<path d="m12 2 2.200 6 5.800-2.500-2.500 5.800 6 2.200-6 2.200 2.500 5.800-5.800-2.500L12 22l-2.200-6-5.800 2.500 2.500-5.800-6-2.200 6-2.200L4 5.500 9.800 8Z"/>',
    moon: '<path d="M20 14.500A8.500 8.500 0 0 1 9.500 4 8.500 8.500 0 1 0 20 14.500Z"/>',
    dna: '<path d="M7 3c0 6 10 6 10 12s-10 6-10 6M17 3c0 6-10 6-10 12s10 6 10 6M8 6.500h8M8 17.500h8M9.500 12h5"/>',
    flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    tea: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM17 10h1.500a2.500 2.500 0 0 1 0 5H17M8 3c-1 1.500 1 2 0 3.500M12 3c-1 1.500 1 2 0 3.500"/>',
    tv: '<rect x="3" y="6" width="18" height="12" rx="1.500"/><path d="M9 21h6M8 3l4 3 4-3"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    up: '<path d="M12 20V5M6 11l6-6 6 6"/>',
    bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.500 2h-15ZM10 21h4"/>',
    leaf: '<path d="M5 19C4 10 9 4 20 4c0 11-6 16-15 15ZM5 19 14 10"/>',
    clap: '<rect x="3.500" y="9" width="17" height="11" rx="1"/><path d="m3.500 9 2-5 3.500 1-2 4M9.500 5l3.500 1-2 4M14 6l3.500 1-2 3"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.500 0 2-1 1.500-2.200-.6-1.300.3-2.800 2-2.800H18a3 3 0 0 0 3-3c0-5-4-10-9-10Z"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="7.500" r="1"/><circle cx="16" cy="10" r="1"/>',
    zzz: '<path d="M5 6h6L5 13h6M13 12h5l-5 6h5"/>',
    rock: '<path d="M4 18 6 9l5-4 6 2 3 6-2 5Z"/>',
    wave: '<path d="M2 9c3-3 5 3 8 0s5 3 8 0 3 0 4 0M2 15c3-3 5 3 8 0s5 3 8 0 3 0 4 0"/>',
    fist: '<path d="M7 11V7a1.5 1.5 0 0 1 3 0V6a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0v3l1 3v3a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4Z"/>',
    trident: '<path d="M12 21V6M6 4v5a6 6 0 0 0 12 0V4M12 3v3"/>',
    log: '<ellipse cx="7" cy="12" rx="3" ry="5"/><path d="M7 7h11a3 5 0 0 1 0 10H7"/>',
    bowling: '<circle cx="12" cy="12" r="8.500"/><path d="M9.500 8.500h.01M13.500 8h.01M12 12h.01" stroke-width="2.600"/>',
    wheel: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v6M12 14v6M4 12h6M14 12h6M6.300 6.300l3.900 3.900M13.800 13.800l3.900 3.900M17.700 6.300l-3.900 3.900M10.200 13.800l-3.900 3.900"/>',
    bed: '<path d="M3 18V7M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="1.500"/>',
    steam: '<path d="M8 20c-2-2 2-3 0-5s2-3 0-5M13 20c-2-2 2-3 0-5s2-3 0-5M18 20c-2-2 2-3 0-5s2-3 0-5"/>',
    dumbbell: '<path d="M6 8v8M3.500 10v4M18 8v8M20.500 10v4M6 12h12"/>',
    meat: '<path d="M5 15c-2-5 3-10 9-9s6 6 2 10-9 4-11-1Z"/><circle cx="12" cy="11.500" r="2"/>',
    face: '<circle cx="12" cy="12" r="8.500"/><path d="M7.500 9.500 10.500 11M16.500 9.500 13.500 11M9 16.500c1.500-1.500 4.500-1.500 6 0"/>',
    paw: '<ellipse cx="12" cy="16" rx="4.500" ry="3.500"/><circle cx="6" cy="11" r="1.700"/><circle cx="10" cy="7.500" r="1.700"/><circle cx="14" cy="7.500" r="1.700"/><circle cx="18" cy="11" r="1.700"/>',
    mushroom: '<path d="M3 12a9 8 0 0 1 18 0ZM10 12v8h4v-8"/>',
    chain: '<rect x="3" y="9" width="10" height="6" rx="3"/><rect x="11" y="9" width="10" height="6" rx="3"/>',
    volcano: '<path d="M3 20 9 9h6l6 11ZM10 9 9 6M14 9l1-3M12 9V4"/>',
    dragon: '<path d="M3 8c4 0 6 2 7 5 1-3 3-5 7-5-1 3-2 4-4 5 2 1 4 3 5 6-4-2-6-1-8 3-2-4-4-5-8-3 1-3 3-5 5-6-2-1-3-2-4-5Z"/>',
    village: '<path d="M3 12 12 4l9 8M6 10v10h12V10M10 20v-5h4v5"/>',
    tree: '<path d="M12 3 6 12h3l-4 6h14l-4-6h3ZM12 18v3"/>',
    church: '<path d="M12 2v5M10 4.500h4M6 21V12l6-5 6 5v9ZM10 21v-5h4v5"/>',
    witch: '<path d="M3 18h18M7 18 12 3l5 15M8.500 13h7"/>',
    castle: '<path d="M4 21V8h3v3h2V8h2v3h2V8h3v3h2V8h1v13ZM10 21v-5a2 2 0 0 1 4 0v5"/>',
    tent: '<path d="M2 20 12 4l10 16ZM12 20v-6"/>',
    beads: '<circle cx="12" cy="12" r="7" stroke-width="3.200" stroke-dasharray="1 3.900"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    hourglass: '<path d="M6 3h12M6 21h12M7 3c0 6 5 6 5 9s-5 3-5 9M17 3c0 6-5 6-5 9s5 3 5 9"/>',
    statue: '<path d="M7 20V9a5 5 0 0 1 10 0v11ZM9.500 12h.01M14.500 12h.01M10 16h4"/>',
    snow: '<path d="M12 3v18M4.200 7.500l15.600 9M19.800 7.500l-15.600 9"/>',
    megaphone: '<path d="M3 10v4h4l9 5V5L7 10ZM19 9a4 4 0 0 1 0 6"/>',
    mountain: '<path d="m2 20 7-12 4 6 3-4 6 10Z"/>',
    fog: '<path d="M4 8h12M8 12h12M4 16h12M8 20h10"/>',
    bandage: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/>',
    disk: '<path d="M4 4h13l3 3v13H4ZM8 4v5h8V4M8 20v-6h8v6"/>',
    scales: '<path d="M12 4v16M6 20h12M5 7h14M5 7l-3 7a3 3 0 0 0 6 0ZM19 7l-3 7a3 3 0 0 0 6 0Z"/>'
  };
  const MAP = {
    '🔮': 'crystal', '💎': 'crystal', '💠': 'crystal', '👑': 'crown', '⚔': 'swords', '🗡': 'dagger', '✨': 'sparkle', '✦': 'sparkle', '✧': 'sparkle',
    '💀': 'skull', '☠': 'skull', '🩸': 'drop', '💧': 'drop', '❤': 'heart', '🤍': 'heart', '⚗': 'flask', '🧪': 'vial', '🪑': 'chair', '🌀': 'spiral',
    '♟': 'pawn', '🧌': 'ogre', '👹': 'ogre', '🔒': 'lock', '🔬': 'magnifier', '🔍': 'magnifier', '♻': 'recycle', '🔄': 'recycle', '🚶': 'walker',
    '🛡': 'shield', '🖼': 'frame', '🌷': 'flower', '🌸': 'flower', '💐': 'flower', '📜': 'scroll', '📖': 'book', '📚': 'books', '💄': 'mirror', '🪞': 'mirror',
    '🔥': 'flame', '🕯': 'candle', '🏮': 'candle', '🪔': 'candle', '🧺': 'basket', '🎒': 'basket', '📦': 'basket', '🧰': 'basket', '🕳': 'hole', '🎀': 'bow',
    '⚠': 'warn', '✕': 'x', '❌': 'x', '⚡': 'bolt', '🗣': 'speech', '💭': 'speech', '💨': 'wind', '★': 'star', '⭐': 'star', '🌟': 'star', '🏛': 'columns',
    '🗺': 'map', '👻': 'ghost', '🏅': 'medal', '🗄': 'cabinet', '🏺': 'vase', '🛢': 'barrel', '📥': 'inbox', '📤': 'outbox', '🏆': 'trophy',
    '🎵': 'note', '♪': 'note', '🎼': 'note', '🔇': 'mute', '🧩': 'puzzle', '💰': 'bag', '🔨': 'hammer', '🪓': 'hammer', '💥': 'burst', '💢': 'burst',
    '🌙': 'moon', '🌕': 'moon', '🌑': 'moon', '🧬': 'dna', '🚩': 'flag', '🏳': 'flag', '👁': 'eye', '🫖': 'tea', '☕': 'tea', '📺': 'tv',
    '✅': 'check', '⬆': 'up', '🔔': 'bell', '🌿': 'leaf', '🍃': 'leaf', '🍀': 'leaf', '🎬': 'clap', '🎨': 'palette', '💤': 'zzz', '🪨': 'rock', '🌊': 'wave', '⚖': 'scales',
    '💪': 'fist', '🔱': 'trident', '🪵': 'log', '🎳': 'bowling', '☸': 'wheel', '🛏': 'bed', '♨': 'steam', '🏋': 'dumbbell', '🥩': 'meat', '😤': 'face', '🐻': 'paw', '🐺': 'paw', '🦁': 'paw',
    '🍄': 'mushroom', '⛓': 'chain', '🌋': 'volcano', '🐲': 'dragon', '🐉': 'dragon', '🏘': 'village', '🌲': 'tree', '⛪': 'church', '🧙': 'witch', '🏰': 'castle', '🎪': 'tent', '📿': 'beads',
    '🎤': 'mic', '⏳': 'hourglass', '🗿': 'statue', '🗽': 'statue', '❄': 'snow', '📣': 'megaphone', '🌄': 'mountain', '⛰': 'mountain', '🌫': 'fog', '🩹': 'bandage', '💾': 'disk'
  };
  const icon = k => `<span class="u-i" data-i="${k}"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#u3-${k}"/></svg></span>`;
  function sprite() {
    if ($('#u3-sprite')) return;
    const d = document.createElement('div'); d.id = 'u3-sprite'; d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">' + Object.keys(P).map(k => `<symbol id="u3-${k}" viewBox="0 0 24 24">${P[k]}</symbol>`).join('') + '</svg>';
    document.body.appendChild(d);
  }
  const EMO_RE = /(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2B50\u2B06\u2B1B\u2B1C])\uFE0F?(?:\u200D[\u2640\u2642]\uFE0F?)?/gu;
  const EMO_TEST = new RegExp(EMO_RE.source, 'u');
  const SKIP_TAG = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'CANVAS', 'SVG', 'TITLE']);
  const SKIP_SEL = '#labels,#seance,#u-fx,#u3-sprite,.u-i,.u-emo,.float,.wlabel,[data-u3-skip],#chessRoot,.chess-root,#chessUI';
  function iconify(root) {
    if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode(n) { const p = n.parentElement; if (!p || SKIP_TAG.has(p.tagName) || p.closest(SKIP_SEL)) return NodeFilter.FILTER_REJECT; return EMO_TEST.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
    const list = []; let n; while ((n = w.nextNode())) list.push(n);
    for (const t of list) {
      const s = t.nodeValue, frag = document.createDocumentFragment(); let last = 0, m; EMO_RE.lastIndex = 0;
      while ((m = EMO_RE.exec(s))) {
        if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
        const ch = m[0].replace(/\uFE0F/g, '').replace(/\u200D[\u2640\u2642]/, ''), k = MAP[ch];
        const sp = document.createElement('span');
        if (k) { sp.innerHTML = icon(k); frag.appendChild(sp.firstChild); } else { sp.className = 'u-emo'; sp.textContent = m[0]; frag.appendChild(sp); }
        last = m.index + m[0].length;
      }
      if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
      t.parentNode.replaceChild(frag, t);
    }
  }
  function startIconObserver() {
    let pend = new Set(), raf = 0;
    const flush = () => { raf = 0; const items = [...pend]; pend.clear(); for (const n of items) { if (n.isConnected) iconify(n.nodeType === 3 ? n.parentNode : n); } mo.takeRecords(); };
    const mo = new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'characterData') { pend.add(m.target); }
        else for (const a of m.addedNodes) if (a.nodeType === 1 || a.nodeType === 3) pend.add(a);
      }
      if (pend.size && !raf) raf = requestAnimationFrame(flush);
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    iconify(document.body); mo.takeRecords();
  }

  // ------------------------------------------------------------------ 音效（合成，接 SFX.ctx / SFX.out；未解锁音频时静默）
  const A = {
    ok() { return window.SFX && SFX.ctx && SFX.out && SFX.ctx.state === 'running'; },
    osc(type, f0, f1, dur, vol, delay = 0) {
      if (!A.ok()) return; const c = SFX.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(SFX.out); o.start(t); o.stop(t + dur + 0.03);
    },
    tick() { A.osc('sine', 2600 + Math.random() * 300, 1800, 0.05, 0.028); },
    press() { A.osc('sine', 170, 55, 0.14, 0.16); A.osc('triangle', 900, 500, 0.05, 0.05); },
    ping(f = 880) { A.osc('triangle', f, f, 0.22, 0.05); A.osc('sine', f * 2, f * 2, 0.3, 0.025, 0.02); },
    hit() { A.osc('sine', 90, 34, 0.32, 0.4); A.osc('sawtooth', 220, 60, 0.18, 0.08); },
    beat() { A.osc('sine', 62, 38, 0.16, 0.34); A.osc('sine', 56, 36, 0.16, 0.24, 0.19); }
  };

  // ------------------------------------------------------------------ 粒子画布
  let fx, fcv, fctx, parts = [], fraf = 0, DPR = 1;
  function ensureFx() {
    if (fx) return; fx = document.createElement('div'); fx.id = 'u-fx';
    fx.innerHTML = '<div class="u-lowv"></div><div class="u-hitv"></div><canvas></canvas>'; document.body.appendChild(fx);
    fcv = fx.querySelector('canvas'); fctx = fcv.getContext('2d'); resize(); addEventListener('resize', resize);
  }
  function resize() { DPR = Math.min(2, devicePixelRatio || 1); fcv.width = innerWidth * DPR; fcv.height = innerHeight * DPR; }
  function burst(x, y, o = {}) {
    ensureFx(); const n = o.n || 12, col = o.color || '#ffd890', sp = o.speed || 240, life = o.life || 0.7, g = o.g == null ? 420 : o.g;
    for (let i = 0; i < n; i++) { const a = o.up ? -Math.PI / 2 + (Math.random() - .5) * 1.6 : Math.random() * 6.283, v = sp * (.3 + Math.random() * .8);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, t: 0, s: (o.size || 2.2) * (.6 + Math.random() * .9), col, g, drag: o.drag || 1.6, tw: Math.random() * 6 }); }
    if (!fraf) fraf = requestAnimationFrame(fxLoop);
  }
  let lastT = 0;
  function fxLoop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0); fctx.clearRect(0, 0, innerWidth, innerHeight); fctx.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt; if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vx *= Math.exp(-p.drag * dt); p.vy = p.vy * Math.exp(-p.drag * dt) + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const k = 1 - p.t / p.life, r = p.s * (0.5 + k); fctx.globalAlpha = k * k * (0.7 + 0.3 * Math.sin(p.tw + p.t * 30));
      const gr = fctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, p.col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      fctx.fillStyle = gr; fctx.beginPath(); fctx.arc(p.x, p.y, r * 3, 0, 6.283); fctx.fill();
    }
    fctx.globalAlpha = 1; fctx.globalCompositeOperation = 'source-over';
    fraf = parts.length ? requestAnimationFrame(fxLoop) : 0; if (!fraf) fctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  // ------------------------------------------------------------------ 菜单/加载 余烬
  function embers(host) {
    if (!host || host.querySelector('#u-embers')) return;
    const cv = document.createElement('canvas'); cv.id = 'u-embers'; host.insertBefore(cv, host.firstChild); const c = cv.getContext('2d');
    let W = 0, H = 0, N = 90, E = [];
    const rs = () => { W = cv.width = host.clientWidth; H = cv.height = host.clientHeight; }; rs(); addEventListener('resize', rs);
    const mk = (init) => ({ x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: .6 + Math.random() * 2.4, vy: 14 + Math.random() * 46, sw: Math.random() * 6.28, sa: 8 + Math.random() * 26, hue: 8 + Math.random() * 34, a: .25 + Math.random() * .75 });
    for (let i = 0; i < N; i++) E.push(mk(true));
    let last = performance.now();
    (function loop(now) {
      if (!host.isConnected) return; requestAnimationFrame(loop);
      if (host.id === 'menu' && host.classList.contains('hidden')) { last = now; return; }
      const dt = Math.min(.05, (now - last) / 1000); last = now; c.clearRect(0, 0, W, H); c.globalCompositeOperation = 'lighter';
      for (const e of E) {
        e.y -= e.vy * dt; e.sw += dt * 1.4; const x = e.x + Math.sin(e.sw) * e.sa; if (e.y < -10) Object.assign(e, mk(false));
        const f = clamp(e.y / H, 0, 1), al = e.a * (0.25 + f * 0.75) * (0.7 + 0.3 * Math.sin(e.sw * 3)), g = c.createRadialGradient(x, e.y, 0, x, e.y, e.r * 4);
        g.addColorStop(0, `hsla(${e.hue + 20},100%,85%,${al})`); g.addColorStop(.3, `hsla(${e.hue},100%,55%,${al * .7})`); g.addColorStop(1, `hsla(${e.hue - 5},100%,40%,0)`);
        c.fillStyle = g; c.beginPath(); c.arc(x, e.y, e.r * 4, 0, 6.283); c.fill();
      }
    })(last);
  }

  // ------------------------------------------------------------------ 交互反馈：悬停音 / 按压 / 聚光灯 / 拒绝抖动 / 点击火花
  const HOVER_SEL = '.modal button:not([disabled]), .bp-item:not(.locked):not(.done), .eq-next, .loc, .hd, .log, .cx, .bigbtn, .smallbtn, #musicCorner, .sc-b, .hv-chip, .train-pad';
  const CARD_SEL = '.bp-item, .eq, .loc, .hd, .log, .cx, .bty, .aff, .merchant';
  let lastHover = null;
  function hoverIn(e) {
    const el = e.target.closest && e.target.closest(HOVER_SEL); if (!el || el === lastHover) return; lastHover = el; A.tick();
  }
  function move(e) {
    const el = e.target.closest && e.target.closest(CARD_SEL); if (!el) return; const r = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }
  function down(e) {
    const t = e.target; if (!t.closest) return;
    const ui = t.closest('#uiroot,#menu,.modal,#wRoot,#musicCorner,.train-pad,#seance');
    if (!ui) return;
    const dis = t.closest('button[disabled],.bp-item.locked,.bp-item.done');
    if (dis) { A.osc('square', 150, 90, .12, .04); return; }
    const hit = t.closest(HOVER_SEL);
    if (hit) { A.press(); burst(e.clientX, e.clientY, { n: 9, color: '#ffd890', speed: 190, life: .55, size: 1.7 }); }
    else if (t.closest('.train-pad')) { burst(e.clientX, e.clientY, { n: 12, color: '#ff8a5a', speed: 300, life: .5, size: 2 }); }
    const poor = t.closest('.bp-item.poor'); if (poor) { poor.classList.remove('shake'); void poor.offsetWidth; poor.classList.add('shake'); A.osc('sawtooth', 110, 70, .16, .05); burst(e.clientX, e.clientY, { n: 8, color: '#ff3a4a', speed: 160, life: .5, size: 1.6 }); }
  }

  // ------------------------------------------------------------------ HUD：血条残影 / 受击 / 低血 / 魂晶增量
  let hp0 = null, coins0 = null, lowT = 0, dAcc = 0, dTimer = 0, wasLow = false;
  function hudInit() {
    const hud = $('#hud'); if (!hud) return;
    const hw = $('.hpwrap', hud); if (hw && !$('#hpghost')) { const g = document.createElement('div'); g.id = 'hpghost'; hw.insertBefore(g, hw.firstChild); }
    if (!$('#u-delta')) { const d = document.createElement('div'); d.id = 'u-delta'; hud.appendChild(d); }
  }
  function pollHud() {
    const Gm = window.G; if (!Gm || !Gm.S || !Gm.st) return;
    let s; try { s = Gm.st(); } catch (e) { return; }
    document.body.classList.toggle('u-world', !!(window.Worlds && Worlds.active));
    const S = Gm.S, max = Math.max(1, s.maxHp), pct = clamp(S.hp / max, 0, 1), ghost = $('#hpghost'), hw = $('.hpwrap');
    if (hp0 == null) { hp0 = S.hp; if (ghost) ghost.style.width = pct * 100 + '%'; }
    if (S.hp < hp0 - 0.5) {
      const frac = clamp((hp0 - S.hp) / max, 0, 1); ensureFx(); const hv = $('.u-hitv', fx);
      hv.style.setProperty('opacity', ''); hv.style.filter = `opacity(${clamp(.45 + frac * 4, .45, 1)})`; hv.classList.remove('go'); void hv.offsetWidth; hv.classList.add('go');
      if (hw) { hw.classList.remove('u-hit'); void hw.offsetWidth; hw.classList.add('u-hit'); }
      const hud = $('#hud'); if (hud && frac > .05) { hud.classList.remove('u-shakeui'); void hud.offsetWidth; hud.classList.add('u-shakeui'); }
      if (frac > .03) A.hit();
      if (ghost) ghost.style.width = (hp0 / max * 100) + '%', void ghost.offsetWidth, ghost.style.width = pct * 100 + '%';
    } else if (S.hp > hp0 + 0.5 && ghost) { ghost.style.transition = 'none'; ghost.style.width = pct * 100 + '%'; void ghost.offsetWidth; ghost.style.transition = ''; }
    hp0 = S.hp;
    const low = pct < .3 && S.hp > 0 && (Gm.playing || (window.Worlds && Worlds.active));
    if (hw) hw.classList.toggle('u-low', pct < .3); ensureFx(); $('.u-lowv', fx).classList.toggle('on', !!low);
    if (low) { lowT += 0.1; if (lowT >= 1.1) { lowT = 0; A.beat(); } } else lowT = 0; wasLow = low;
    // 魂晶
    const c = Math.floor(S.coins);
    if (coins0 == null) coins0 = c;
    if (c !== coins0) {
      const d = c - coins0; coins0 = c; const el = $('#coins');
      if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
      dAcc += d; clearTimeout(dTimer); dTimer = setTimeout(() => flushDelta(), 220);
    }
  }
  function flushDelta() {
    const d = dAcc; dAcc = 0; const host = $('#u-delta'); if (!host || !d) return;
    const i = document.createElement('i'); i.textContent = (d > 0 ? '+' : '−') + Math.abs(d).toLocaleString(); if (d < 0) { i.style.color = '#ffb0b0'; i.style.textShadow = '0 0 10px #f33, 0 2px 4px #000'; }
    host.appendChild(i); setTimeout(() => i.remove(), 1150);
    if (d > 0) { const el = $('#coins'); if (el) { const r = el.getBoundingClientRect(); burst(r.left + 20, r.top + 16, { n: Math.min(16, 4 + Math.log10(d + 1) * 4), color: '#c79bff', speed: 110, life: .7, size: 1.0, g: -60 }); } if (d >= 50) A.ping(660 + Math.min(600, d)); else A.tick(); }
  }

  // ------------------------------------------------------------------ 抽卡：卡片出现时爆粒子
  function gachaWatch() {
    const onCard = n => setTimeout(() => {
      const r = n.getBoundingClientRect(), col = getComputedStyle(n).getPropertyValue('--c').trim() || '#ffd890', hi = n.classList.contains('r4') ? 3 : n.classList.contains('r3') ? 2 : 1;
      burst(r.left + r.width / 2, r.top + r.height * .45, { n: 14 * hi, color: col, speed: 200 + hi * 90, life: .9 + hi * .25, size: 1.6 + hi * .3, g: 240 });
      if (n.classList.contains('shiny')) burst(r.left + r.width / 2, r.top, { n: 30, color: '#ffe27a', speed: 380, life: 1.3, size: 2, g: 300 });
      A.ping(520 + hi * 180);
    }, 90);
    const attach = g => new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('gcard')) onCard(n); }).observe(g, { childList: true });
    const g = $('#gacha'); if (g) attach(g);
    else new MutationObserver((ms, mo) => { const g2 = $('#gacha'); if (g2) { attach(g2); mo.disconnect(); } }).observe(document.body, { childList: true });
  }

  // ------------------------------------------------------------------ 出猎世界反馈：命中标记 / 成就 / 连击里程碑（只观察 #wRoot 里 worlds.js 生成的 DOM）
  function worldWatch() {
    let hm; const marker = heavy => {
      if (!hm) { hm = document.createElement('div'); hm.id = 'u-hm'; hm.innerHTML = [45, 135, 225, 315].map(r => `<i style="--r:${r}deg"></i>`).join(''); document.body.appendChild(hm); }
      hm.classList.toggle('heavy', !!heavy); hm.classList.remove('go'); void hm.offsetWidth; hm.classList.add('go');
    };
    let lastCombo = 0;
    const onNode = n => {
      if (n.nodeType !== 1) return; const cl = n.classList;
      if (cl.contains('wsay') && cl.contains('rew')) { A.ping(760); const r = n.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, { n: 10, color: '#c79bff', speed: 150, life: .7, size: 1.2, g: -40 }); }
      else if (cl.contains('wsay') && cl.contains('dmg')) { const v = parseInt(n.textContent, 10) || 0; marker(v >= 60); }
      else if (cl.contains('wach')) { A.ping(523); A.ping(784); burst(innerWidth / 2, innerHeight * .2, { n: 46, color: '#ffd27a', speed: 420, life: 1.2, size: 1.8, g: 260 }); }
    };
    const attach = root => {
      new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) onNode(n); }).observe(root, { childList: true, subtree: true });
      new MutationObserver(() => { const c = $('.wcombo b', root), v = c ? parseInt(c.textContent, 10) || 0 : 0;
        if (v > lastCombo && [5, 10, 15, 20, 30, 50].includes(v)) { A.ping(440 * Math.pow(2, Math.min(v, 30) / 24)); burst(innerWidth * .86, innerHeight * .4, { n: 18 + v, color: '#ff8a4a', speed: 320, life: .8, size: 1.7, g: 200 }); }
        lastCombo = v; }).observe(root, { childList: true, subtree: true, characterData: true });
    };
    const r = $('#wRoot'); if (r) attach(r);
    else new MutationObserver((ms, mo) => { const r2 = $('#wRoot'); if (r2) { attach(r2); mo.disconnect(); } }).observe(document.body, { childList: true });
  }

  // ------------------------------------------------------------------ 菜单：存档信息 / 继续按钮 / 快捷键提示条
  function menuInfo() {
    const m = $('#menu'), sb = $('#startBtn'); if (!m || !sb) return;
    let el = $('#u-save'); if (!el) { el = document.createElement('div'); el.id = 'u-save'; m.insertBefore(el, sb); }
    const upd = () => { const Gm = window.G; if (!Gm || !Gm.S || m.classList.contains('hidden')) return; const S = Gm.S, has = !!S.intro;
      const n = (S.heads || []).length; sb.textContent = has ? '继续游戏' : '开始游戏';
      const h = `第 <b>${S.depth || 1}</b> 层 <span style="opacity:.4">·</span> ${icon('crystal')} <b>${Math.floor(S.coins || 0).toLocaleString()}</b> <span style="opacity:.4">·</span> ${icon('skull')} <b>${n}</b>`;
      if (el._h !== h) { el._h = h; el.innerHTML = has ? h : '新的狩猎，从这里开始'; } };
    upd(); setInterval(upd, 800);
  }
  function hintInit() {
    const h = $('#hint'); if (!h) return; let tag = $('#hintTag');
    if (!tag) { tag = document.createElement('div'); tag.id = 'hintTag'; tag.textContent = '操作提示'; h.after(tag); }
    tag.addEventListener('mouseenter', () => h.classList.add('u-peek')); tag.addEventListener('mouseleave', () => h.classList.remove('u-peek'));
    let t0 = 0; const iv = setInterval(() => { const m = $('#menu'); if (m && !m.classList.contains('hidden')) { t0 = 0; return; } if (!t0) t0 = performance.now(); if (performance.now() - t0 > 28000) { h.classList.add('u-min'); clearInterval(iv); } }, 1000);
  }


  // ------------------------------------------------------------------ 弹窗内容入场（给直接子元素 / 卡片写 --i / --j 用于错峰）
  function stagger() {
    const root = $('#uiroot'), panel = root && $('.modal', root); if (!panel) return;
    const run = () => {
      [...panel.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 8)));
      panel.querySelectorAll('.bp-grid,.eqs,.locs,.hd-grid,.cx-grid,.btys,.logs,.kv+.items,[data-stg]').forEach(g => [...g.children].forEach((c, j) => c.style.setProperty('--j', Math.min(j, 18))));
      panel.querySelectorAll('.st-row').forEach((c, j) => c.style.setProperty('--j', j));
    };
    new MutationObserver(run).observe(panel, { childList: true }); run();
    new MutationObserver(() => { if (root.classList.contains('on')) { panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = ''; } }).observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  const TIPS = ['<b>点击 60 次</b>才能把首级背回洞里——在外面，每一下都算数。', '完美格挡后，敌人的<b>脖子</b>没有防备。', '异色首级的产出是普通的<b>三倍</b>。', '首级放在<b>展示位</b>上，同族与同阶会产生共鸣。', '<b>长按 E</b> 进入精确摆放，绿色是可以放下的位置。', '在外面死掉，<b>一切归零</b>——先喝药，再进门。', '洞窟越深，<b>越暗</b>，也越值钱。'];
  function loadTips() {
    const l = $('#loading'); if (!l || $('#u-tip')) return; const t = document.createElement('div'); t.id = 'u-tip'; l.appendChild(t); let i = Math.floor(Math.random() * TIPS.length);
    const show = () => { if (!t.isConnected) return; t.style.opacity = 0; setTimeout(() => { t.innerHTML = TIPS[i++ % TIPS.length]; t.style.opacity = 1; }, 450); }; show(); const iv = setInterval(() => { if (!t.isConnected) clearInterval(iv); else show(); }, 4200);
  }
  function curtain() {
    const b = $('#startBtn'); if (!b) return; const c = document.createElement('div'); c.id = 'u-curtain'; document.body.appendChild(c);
    b.addEventListener('click', () => { c.classList.remove('go'); void c.offsetWidth; c.classList.add('go'); burst(innerWidth / 2, innerHeight / 2, { n: 40, color: '#ff8a4a', speed: 520, life: 1, size: 2, g: 100 }); A.osc('sine', 80, 30, .8, .35); A.osc('sawtooth', 300, 40, .6, .05); }, true);
  }

  // ------------------------------------------------------------------ 启动
  function init() {
    if (window.Mods && Mods.on('lowspec')) document.body.classList.add('u-lite');
    sprite(); loadTips(); startIconObserver(); ensureFx(); hudInit(); gachaWatch(); worldWatch(); menuInfo(); hintInit(); stagger(); curtain();
    embers($('#menu')); embers($('#loading'));
    document.addEventListener('mouseover', hoverIn, true); document.addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerdown', down, true);
    setInterval(pollHud, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return { icon, iconify, burst, sfx: A, MAP, P };
})();
