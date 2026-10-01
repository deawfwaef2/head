// R38（主管）：CC0 模式（MOD `cc0_only`，默认开）——游戏里只出现 CC0 授权的人物模型；关掉 = 所有模型（含私人使用的 MMD/原神头与身体）。
// 用户：“你默认开启 CC0 模式，就是游戏里只有 CC0 模型。但是可以关闭这个。”
// 依据 CREDITS.md + pixiv 官方说明（AvatarSample_A/B/C、K/L/S 不是 CC0，只是“样本条款”；VRM Public License、CC-BY、VRoid Hub 作者条款、MMD 规约都不算 CC0）。
// 头：heads.js 用 CC0.okHead(file) 过滤随机池/发型/饰品，并在 create() 时把旧存档里的非 CC0 头按种子固定换成 CC0 头。
// 身体：foe.js build() 入口用 CC0.body(name, seed) 把非 CC0 身体换成 CC0 身体。
// 动作（Quaternius UAL）、野兽/道具（Quaternius）、场景（Poly Haven）本来就是 CC0，不受影响。
window.CC0 = (() => {
  const HEADS = ['Sendagaya_Shino', 'Sendagaya_Shibu', 'Darkness_Shibu', 'Vivi', 'Vita', 'Victoria_Rubin', 'HairSample_Female', 'AvatarSample_D_Darkness', 'Base_Female', 'Sakurada_Fumiriya', 'HairSample_Male']; // R40：+2 个 pixiv CC0 男性头（身体未接入，见 HANDOFF R40）
  const BODIES = ['Vita', 'Victoria_Rubin', 'Darkness_Shibu', 'HairSample_Female'];
  const QB = []; // R51：Q_* 文件已按用户要求删除（原 R43b Quaternius 低模） // R43b：Quaternius「Ultimate Modular Women」（CC0）低多边形身体，头换成动漫头；只按身份(OUTFIT)指定，不进随机后备池
  const HS = new Set(HEADS), BS = new Set(BODIES.concat(QB));
  const on = () => { try { return !window.Mods || !Mods.on || Mods.on('cc0_only') !== false; } catch (e) { return true; } };
  const hash = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function okHead(file) { return !on() || HS.has(file); }
  function okBody(name) { return !on() || BS.has(name); }
  // R50 MOD body_qc50：用户“合作者的新身体很怪——身体肤色和头不一样、头没接上、好多坏的”。逐个渲染质检后，
  // Q_Witch / Q_Medieval / Q_Adventurer / Q_Formal / Q_Soldier（纯色无贴图低模、爪形手、手臂姿势坏、肤色与动漫头不符）停用，
  // 按身份换成风格相近的好身体。文件不删（规则：永不删身体），关掉 MOD 即恢复。Q_Ranger / Q_Peasant（有贴图）保留。
  const QBAD = { Q_Witch: 'Darkness_Shibu', Q_Medieval: 'Vita', Q_Adventurer: 'Vita', Q_Formal: 'HairSample_Female', Q_Soldier: 'Vita', Q_Ranger: 'Vita', Q_Peasant: 'HairSample_Female' }; // R51：Q_* 文件已删，旧引用一律换走
  const qc50 = () => true; // R51：Q_* 已删除，映射必须始终生效
  // R51 MOD vroid_only（默认开）：用户“身体只要 VRoid 女性模型！非 CC0 也行”。开启时所有人物身体只从下面 8 具 VRoid 女性身体里选
  // （不管 cc0_only 开没开）；Q_* 低模已按用户要求删除，原神 MMD 身体、光莉（身高 1.13 幼态）不再出现。
  const VRF = ['Vita', 'Victoria_Rubin', 'Darkness_Shibu', 'HairSample_Female', 'AvatarSample_A', 'AvatarSample_B', 'Osage', 'V_KF'];
  const VRS = new Set(VRF);
  const vroidOnly = () => { try { return !window.Mods || !Mods.on || Mods.on('vroid_only') !== false; } catch (e) { return true; } };
  function body(name, seed) {
    if (vroidOnly()) return (VRS.has(name) || (window.VH_PACK && VH_PACK[name] && (!window.Mods || !Mods.on || Mods.on('vh_bodies') !== false))) ? name : VRF[hash(name + '|' + (seed || 0)) % VRF.length];
    if (QBAD[name] && qc50()) name = QBAD[name];
    if (okBody(name)) return name;
    const have = BODIES.filter(b => !window.BODY_LIST || BODY_LIST.includes(b)); const L = have.length ? have : BODIES;
    return L[hash(name + '|' + (seed || 0)) % L.length];
  }
  return { on, okHead, okBody, body, hash, HEADS, BODIES, QB, QBAD, VRF, vroidOnly };
})();
