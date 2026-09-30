// R43 MOD id_look（默认开）：让“身份”决定外观。
// 用户：“人物形象完全不符合角色身份——你应该去找合适的衣服-头发-饰品。”
// 以前外观只看种族（随机发色/随机头饰），修女戴兔耳、骑士扎蝴蝶结、女巫没帽子。现在按身份：
//  · 发色：每个身份一组合理的发色（骑士银/金/棕，女巫紫/黑，修女黑/褐……）
//  · 头饰：整套重配（修女=头纱，女巫=尖帽，公主=小王冠，女王=王冠，工匠/炼金=护目镜，游侠=羽毛……），去掉不合身份的王冠/蝴蝶结
//  · 衣服：CC0 模式只有 4 具身体，所以用“按亮度重新着色”的方式给衣服换色（修女=黑修道服，骑士=钢灰，游侠=森林绿，女王=深红……），
//    只改材质名以 _CLOTH 结尾的衣服/鞋，不动皮肤/头发/眼睛。材质克隆后再改，不影响别的单位。
window.IdLook = (() => {
  const on = () => !window.Mods || Mods.on('id_look') !== false;
  const rng = (seed) => { let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1; return () => (s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0) / 4294967296; };
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  // 衣服着色：hex=目标色，k=保留多少原色（0=纯单色），g=增益
  const TINT = {
    steel: ['#9aa8bc', .15, 1.25], leather: ['#7a5a3c', .2, 1.3], forest: ['#4f7a48', .2, 1.35], green: ['#6fa060', .25, 1.3], shadow: ['#3a3844', .1, 1.25],
    crimson: ['#9a2030', .15, 1.3], crimsonsteel: ['#a8404a', .15, 1.25], steelgold: ['#c8a850', .15, 1.2], inq: ['#5a1a28', .15, 1.2], wolf: ['#8a949c', .2, 1.2],
    plum: ['#7a4a9a', .25, 1.3], violet: ['#6a3a9a', .15, 1.35], darkred: ['#6a1420', .15, 1.2], bog: ['#4a6a48', .15, 1.25], wine: ['#7a2438', .2, 1.3],
    royalblue: ['#3a5aa0', .2, 1.3], alch: ['#b87a3a', .2, 1.25], habit: ['#1c1b22', .05, .9], habit2: ['#2b2a33', .05, 1.0], white: ['#f2efe8', .3, 1.05],
    moon: ['#b8c4e8', .25, 1.15], elf: ['#a8d0a0', .25, 1.2], vermilion: ['#c2342a', .2, 1.3], abyss: ['#3a1850', .15, 1.25], crimsongold: ['#b03a2a', .15, 1.3],
    grey: ['#8a8a90', .2, 1.1], earth: ['#9a7a5a', .25, 1.2], rose: null
  };
  // 身份 → { hair:发色名[], acc:[], hw:{头饰:概率}, hx:发型[](可空), tint }
  const S = {
    villager: { hair: ['深褐', '栗棕', '焦糖', '奶茶', '亚麻金'], hw: { ribbon: .25 }, tint: 'earth' },
    shepherd: { hair: ['栗棕', '奶茶', '亚麻金', '焦糖'], hw: { flowercrown: .35 }, tint: 'earth' },
    barmaid: { hair: ['栗棕', '焦糖', '橘铜', '深褐'], hw: { maid: .85 }, tint: 'wine' },
    smithgirl: { hair: ['深褐', '锈红', '橘铜', '乌黑'], hw: { goggles: .6 }, hx: ['pony', 'braid'], tint: 'leather' },
    herbalist: { hair: ['翠绿', '薄荷', '栗棕', '奶茶'], hw: { flowercrown: .6 }, tint: 'green' },
    huntress: { hair: ['栗棕', '深褐', '墨绿', '焦糖'], hw: { feather: .75 }, hx: ['pony', 'braid'], tint: 'forest' },
    bard: { hair: ['樱粉', '玫瑰', '蜜糖金', '湖蓝', '薰衣紫'], hw: { beret: .85, feather: .6 }, tint: 'plum' },
    novice: { hair: ['栗棕', '奶茶', '亚麻金', '深褐'], hw: { veil: .9 }, tint: 'grey' },
    ranger: { hair: ['墨绿', '栗棕', '深褐', '翠绿'], hw: { feather: .55 }, hx: ['pony', 'braid'], tint: 'forest' },
    druid: { hair: ['翠绿', '薄荷', '墨绿', '栗棕'], hw: { flowercrown: .85, feather: .3 }, tint: 'green' },
    singer: { hair: ['樱粉', '玫瑰', '薰衣紫', '冰蓝', '铂金'], hw: { ribbon: .5, flowercrown: .3 }, tint: 'rose' },
    archer: { hair: ['墨绿', '深褐', '栗棕', '青灰'], hw: { feather: .6 }, hx: ['pony', 'braid'], tint: 'forest' },
    moonpriest: { hair: ['月银蓝', '银白', '冰蓝', '薰衣紫'], acc: ['circletS'], hw: { kanzashi: .5 }, tint: 'moon' },
    elfprincess: { hair: ['铂金', '亚麻金', '月银蓝', '翠绿', '薄荷'], acc: ['circletS'], hw: { flowercrown: .4 }, tint: 'elf' },
    wolfwarrior: { hair: ['灰烬', '青灰', '银白', '乌黑'], hw: { feather: .55 }, hx: ['pony', 'braid2'], tint: 'wolf' },
    foxmiko: { hair: ['橘铜', '火红', '雪白', '锈红'], hw: { kanzashi: .9, bells: .8 }, tint: 'vermilion' },
    catthief: { hair: ['乌黑', '墨蓝', '灰烬', '黑紫'], hw: { bells: .55 }, hx: ['pony', 'twin'], tint: 'shadow' },
    shaman: { hair: ['乌黑', '深褐', '锈红', '青灰'], hw: { feather: .9 }, hx: ['braid', 'braid2'], tint: 'earth' },
    chieftess: { hair: ['火红', '锈红', '乌黑', '橘铜'], hw: { feather: .8, thorncrown: .2 }, hx: ['braid', 'pony'], tint: 'leather' },
    falconer: { hair: ['栗棕', '焦糖', '灰烬', '奶茶'], hw: { feather: .9 }, hx: ['pony', 'braid'], tint: 'leather' },
    nun: { hair: ['乌黑', '深褐', '栗棕', '灰烬'], hw: { veil: 1 }, hx: [null], tint: 'habit' },
    paladin: { hair: ['亚麻金', '蜜糖金', '铂金', '栗棕'], acc: ['circlet'], hw: {}, hx: ['pony', 'braid'], tint: 'steelgold' },
    choir: { hair: ['亚麻金', '铂金', '雪白', '冰蓝'], hw: { ribbon: .3, flowercrown: .3 }, tint: 'white' },
    inquisitor: { hair: ['乌黑', '酒红', '灰烬', '银白'], hw: { minihat: .5 }, hx: ['pony', 'bun'], tint: 'inq' },
    saint: { hair: ['雪白', '铂金', '亚麻金', '银白'], acc: ['circlet'], hw: { veil: .35, flowercrown: .3 }, tint: 'white' },
    abbess: { hair: ['银白', '灰烬', '雪白'], hw: { veil: 1 }, hx: [null], tint: 'habit2' },
    witch: { hair: ['夜紫', '黑紫', '乌黑', '墨蓝', '薰衣紫'], acc: ['witchhat'], hw: { star: .5 }, tint: 'violet' },
    alchemist: { hair: ['橘铜', '焦糖', '薄荷', '栗棕'], hw: { goggles: .9 }, hx: ['pony', 'bun'], tint: 'alch' },
    hexer: { hair: ['黑紫', '血红', '乌黑', '夜紫'], hw: { thorncrown: .7 }, tint: 'darkred' },
    bogwitch: { hair: ['墨绿', '翠绿', '灰烬', '青灰'], acc: ['witchhat'], hw: {}, tint: 'bog' },
    covenlady: { hair: ['黑紫', '酒红', '夜紫', '乌黑'], hw: { minihat: .6, thorncrown: .3 }, tint: 'violet' },
    countess: { hair: ['酒红', '乌黑', '玫瑰', '铂金'], hw: { minihat: .8 }, tint: 'wine' },
    knight: { hair: ['亚麻金', '栗棕', '铂金', '银白', '火红'], hw: {}, hx: ['pony', 'braid', 'bun'], tint: 'steel' },
    merc: { hair: ['深褐', '锈红', '灰烬', '乌黑'], hw: { goggles: .3 }, hx: ['pony', 'braid'], tint: 'leather' },
    crossbow: { hair: ['栗棕', '焦糖', '乌黑'], hw: { goggles: .5 }, hx: ['pony', 'braid'], tint: 'leather' },
    medic: { hair: ['奶茶', '亚麻金', '樱粉', '栗棕'], hw: { ribbon: .4 }, tint: 'white' },
    engineer: { hair: ['橘铜', '焦糖', '青灰', '乌黑'], hw: { goggles: 1 }, hx: ['pony', 'bun'], tint: 'leather' },
    general: { hair: ['银白', '灰烬', '乌黑', '火红'], hw: {}, hx: ['pony', 'braid'], tint: 'crimson' },
    dragonknight: { hair: ['火红', '血红', '银白', '乌黑'], hw: {}, hx: ['pony', 'braid2'], tint: 'crimsonsteel' },
    princess: { hair: ['亚麻金', '樱粉', '铂金', '蜜糖金'], acc: ['tiara'], hw: { twinbows: .15 }, tint: 'rose' },
    lady: { hair: ['亚麻金', '栗棕', '玫瑰', '铂金'], hw: { minihat: .6, ribbon: .4 }, tint: 'rose' },
    courtmage: { hair: ['墨蓝', '夜紫', '银白', '月银蓝'], hw: { beret: .4 }, tint: 'royalblue' },
    assassin: { hair: ['乌黑', '墨蓝', '黑紫', '灰烬'], hw: {}, hx: ['pony', 'twin'], tint: 'shadow' },
    guard: { hair: ['深褐', '乌黑', '栗棕', '灰烬'], hw: {}, hx: ['pony', 'braid'], tint: 'steel' },
    musician: { hair: ['樱粉', '玫瑰', '蜜糖金', '湖蓝'], hw: { beret: .7, ribbon: .3 }, tint: 'plum' },
    queen: { hair: ['乌黑', '铂金', '酒红', '亚麻金'], acc: ['crown'], hw: {}, tint: 'crimson' },
    succubus: { hair: ['黑紫', '血红', '玫瑰', '乌黑'], hw: { thorncrown: .5 }, tint: 'darkred' },
    fallen: { hair: ['乌黑', '黑紫', '银白', '雪白'], hw: { thorncrown: .8 }, tint: 'shadow' },
    duchess: { hair: ['酒红', '乌黑', '铂金', '玫瑰'], hw: { minihat: .7 }, tint: 'wine' },
    shadow: { hair: ['乌黑', '墨蓝', '黑紫'], hw: {}, hx: ['pony'], tint: 'shadow' },
    abyssqueen: { hair: ['黑紫', '夜紫', '血红', '乌黑'], acc: ['crown'], hw: { thorncrown: .6 }, tint: 'abyss' },
    dragonprincess: { hair: ['火红', '银白', '亚麻金', '血红'], acc: ['tiara'], hw: { kanzashi: .4 }, tint: 'crimsongold' },
    avatar: { hair: ['雪白', '铂金', '银白'], acc: ['circlet'], hw: { flowercrown: .5 }, tint: 'white' },
    archangel: { hair: ['铂金', '雪白', '亚麻金'], acc: ['circlet'], hw: {}, tint: 'white' },
    dragonslayer: { hair: ['灰烬', '乌黑', '银白', '锈红'], hw: {}, hx: ['pony', 'braid'], tint: 'steel' },
    dragonmiko: { hair: ['火红', '血红', '雪白', '橘铜'], hw: { kanzashi: .8, bells: .5 }, tint: 'vermilion' }
  };
  const HEADGEAR = ['crown', 'tiara', 'witchhat', 'circlet', 'circletS', 'flowers'];
  const HXN = { pony: '马尾', twin: '双马尾', drill: '钻头卷', bun: '丸子头', odango: '双丸子', braid: '麻花辫', braid2: '双麻花辫' };

  // 改 look（一次；头被砍下后是同一个 look，所以头也一致）
  function apply(h) {
    if (!on() || !h || !h.c || !h.look || h.look._idl) return;
    const sp = S[h.c.id]; if (!sp) return; const L = h.look; L._idl = 1;
    const r = rng((L.seed || 1) * 7919 + 13);
    if (L.hn !== '原色' && sp.hair && window.ModelHeads && ModelHeads.HAIR) {
      const n = pick(r, sp.hair), hh = ModelHeads.HAIR.find(x => x[0] === n);
      if (hh) { L.hn = hh[0]; L.hc1 = hh[1]; const two = r() < 0.2 && sp.hair.length > 1 ? ModelHeads.HAIR.find(x => x[0] === pick(r, sp.hair)) : hh; L.hn2 = two[0]; L.hc2 = two[1]; }
    }
    L.acc = (L.acc || []).filter(a => !HEADGEAR.includes(a)).concat(sp.acc || []);
    if (L.ax) L.ax = [];
    if (sp.hx) { const s0 = pick(r, sp.hx); if (s0 === null) { delete L.hx; delete L.hn3; } else if (!L.hx || L.hx.s !== s0) { L.hx = { s: s0, len: +(0.75 + r() * 0.5).toFixed(2), rib: (L.hx && L.hx.rib) || '#1a1a22', seed: (L.hx && L.hx.seed) || 1 + Math.floor(r() * 9999) }; L.hn3 = HXN[s0]; } }
    if (window.HeadWear && HeadWear.item) { // 头饰整套重配
      const out = [], used = new Set(), blockedHat = L.acc.some(a => ['witchhat', 'crown'].includes(a)), blockedBand = L.acc.some(a => ['tiara', 'circlet', 'circletS', 'witchhat', 'crown'].includes(a));
      const tf = (window.Mods && Mods.on('tier_look')) ? [0.6, 0.8, 1, 1.15, 1.3][Math.max(0, Math.min(4, h.c.rar | 0))] : 1;
      for (const k of Object.keys(sp.hw || {})) {
        if (out.length >= 2 || r() >= Math.min(1, sp.hw[k] * tf)) continue; const g = HeadWear.GROUP[k];
        if (used.has(g) || (g === 'hat' && (blockedHat || used.has('band'))) || (g === 'band' && (blockedBand || used.has('hat')))) continue;
        used.add(g); out.push(HeadWear.item(k, (L.seed || 1) * 131 + out.length * 17));
      }
      L.hw = out;
    }
  }

  // 衣服着色（身体 build 之后调用）
  const toLin = (c) => new THREE.Color(c).convertSRGBToLinear();
  function dress(f, id, seed) {
    if (!on() || !f || !f.root) return; const sp = S[id], T = sp && TINT[sp.tint]; if (!T) return;
    const c = toLin(T[0]), tg = new THREE.Vector3(c.r * T[2] * 1.15, c.g * T[2] * 1.15, c.b * T[2] * 1.15), U = { uIdT: { value: tg }, uIdK: { value: T[1] } };
    const cache = new Map();
    f.root.traverse(o => {
      if (!o.isMesh || !o.material || o.userData.cut) return; const arr = Array.isArray(o.material) ? o.material : [o.material], out = arr.map(m => {
        if (!m || !/_CLOTH$/.test(m.name || '') || !m.map) return m; if (cache.has(m)) return cache.get(m);
        const n = m.clone(), prev = m.onBeforeCompile, pk = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
        n.onBeforeCompile = (sh, rd) => { if (prev) prev(sh, rd); sh.uniforms.uIdT = U.uIdT; sh.uniforms.uIdK = U.uIdK;
          sh.fragmentShader = 'uniform vec3 uIdT; uniform float uIdK;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n float idl = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = mix(vec3(idl), diffuseColor.rgb, uIdK) * uIdT;'); };
        n.customProgramCacheKey = () => pk + '|idtint'; n.userData = Object.assign({}, m.userData, { idtint: 1 }); n.needsUpdate = true; cache.set(m, n); return n; });
      o.material = Array.isArray(o.material) ? out : out[0];
    });
  }
  return { on, apply, dress, S, TINT };
})();
