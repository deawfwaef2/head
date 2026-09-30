// 协同扩展模块（Sanctum & Contraptions）：
// 1. PropModels：解析并缓存 Poly Haven CC0 高精度扫描 3D 模型（models/props_pack.js，离线 base64 GLB，支持 file://）。
// 2. 藏首建筑群（Stage 1）：哥特藏首橱、枝形首级吊灯、百首博古架、哥特雕花供案、大理石无头胸像座、无头圣女石像、传世古董魂瓮、腌渍魂桶阵、万首寒铁冰窖。
// 3. 恶趣味把玩机关群（Stage 2）：虎钳榨魂台、处刑理发转椅、落地摆钟刑架、首级加农炮、百首飞镖靶、炼金蒸馏魂台、断头八音盒合唱台。
window.PropModels = (() => {
  const T = {};
  let ready = false;
  function b64ToBuf(b64) {
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  function parseOne(name, entry) {
    return new Promise(res => {
      try {
        new THREE.GLTFLoader().parse(b64ToBuf(entry.b64), '', gltf => {
          entry.b64 = null;
          gltf.scene.traverse(o => {
            if (o.isMesh && o.material) {
              o.castShadow = true; o.receiveShadow = true;
              if (o.material.map) { o.material.map.encoding = THREE.sRGBEncoding; o.material.map.anisotropy = 8; }
              o.material.roughness = Math.min(0.92, Math.max(0.25, o.material.roughness || 0.75));
              o.material.envMapIntensity = 0.35;
            }
          });
          T[name] = { scene: gltf.scene, min: entry.min, max: entry.max };
          res(true);
        }, () => res(false));
      } catch (e) { console.warn('PropModels parse error:', name, e); res(false); }
    });
  }
  async function init(onProg) {
    if (ready) return;
    const pack = window.PROP_PACK || {};
    const keys = Object.keys(pack);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (onProg) try { onProg((i + 1) / keys.length, '高精建筑模型 · ' + k); } catch (e) {}
      await parseOne(k, pack[k]);
    }
    ready = true;
  }
  // 包装 ModelHeads.init，确保在 startGame() 前完成所有高精度建筑 GLB 解析
  if (window.ModelHeads && ModelHeads.init) {
    const _orig = ModelHeads.init;
    ModelHeads.init = async function (onProg) {
      await _orig.call(ModelHeads, onProg);
      await init(onProg);
    };
  }
  // 克隆指定模型；深拷贝 geometry 与 material，防止拆除建筑 dispose() 或建造预览染色污染模板
  function model(name, opts = {}) {
    const wrap = new THREE.Group();
    const apply = src => {
      const c = src.clone(true);
      c.traverse(o => {
        if (o.isMesh) {
          o.geometry = o.geometry.clone();
          o.material = o.material.clone();
          if (window.Assets && window.G && G.renderer && o.material.isMeshStandardMaterial) {
            o.material.envMap = Assets.env(G.renderer);
          }
          if (opts.tint) o.material.color.multiply(new THREE.Color(opts.tint));
          if (opts.roughness != null) o.material.roughness = opts.roughness;
          if (opts.metalness != null) o.material.metalness = opts.metalness;
        }
      });
      if (opts.scale != null) {
        if (Array.isArray(opts.scale)) c.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
        else c.scale.setScalar(opts.scale);
      }
      if (opts.rotY) c.rotation.y = opts.rotY;
      if (opts.rotX) c.rotation.x = opts.rotX;
      if (opts.rotZ) c.rotation.z = opts.rotZ;
      if (opts.pos) c.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
      wrap.add(c);
    };
    if (T[name]) apply(T[name].scene);
    else {
      const timer = setInterval(() => { if (T[name]) { clearInterval(timer); apply(T[name].scene); } }, 120);
    }
    return wrap;
  }
  return { init, model, get ready() { return ready; }, T };
})();

window.Sanctum = (() => {
  const B = window.BuildCat;
  if (!B) return {};
  const { C, M, std, mesh, box, cyl, rock, skull, flame, glowMat } = B;
  const V3 = THREE.Vector3;
  const PM = PropModels.model;
  const fmt = n => (window.G && G.fmtN) ? G.fmtN(n) : String(Math.round(n));
  const ring = (n, r, y, yawFn) => Array.from({ length: n }, (_, k) => {
    const a = k / n * Math.PI * 2 + Math.PI / n;
    return [Math.cos(a) * r, y, Math.sin(a) * r, yawFn ? yawFn(a) : 0];
  });

  // =========================================================================
  // 第一批：高精度藏首与陈列建筑群（存放头部 + 专属互动机制）
  // =========================================================================

  // 1) 哥特藏首橱（GothicCabinet_01）：双层 6 槽位雕花展柜，柜门敞开，空手按 E 触发「开柜巡礼」
  C.gothic_cabinet = {
    cat: 'func', n: '哥特藏首橱', icon: '🗄️', base: 1400, grow: 1.65, fp: [0.85, 0.52],
    stat: { soul: 4, ter: 3 }, depth: 2, showcase: true,
    desc: '高精雕花哥特木橱（柜门大敞），可分层陈列 6 颗首级，展厅分 ×1.6。每 14 秒 ×2.0 产出；空手按 E 进行「开柜巡礼」令柜内全体首级齐齐战栗喷涌魂晶（冷却 18 秒）',
    mount: {
      y: 1.5, period: 14, mult: 2.0, labelY: 2.35,
      slots: [
        [-0.36, 1.76, 0.06, 0], [0, 1.76, 0.06, 0], [0.36, 1.76, 0.06, 0],
        [-0.36, 1.24, 0.08, 0], [0, 1.24, 0.08, 0], [0.36, 1.24, 0.08, 0]
      ]
    },
    make() {
      const g = new THREE.Group();
      g.add(PM('GothicCabinet_01', { scale: 0.96 }));
      // 内部丝绒层板衬垫与幽暗烛火
      const velvet = std('#4a0814', { roughness: 0.9 });
      g.add(box(1.18, 0.025, 0.46, velvet, 0, 1.72, 0.04));
      g.add(box(1.18, 0.025, 0.46, velvet, 0, 1.20, 0.04));
      for (const sx of [-0.52, 0.52]) {
        g.add(flame(sx, 1.76, 0.24, 0.55, '#ff8a4a'));
        g.add(flame(sx, 1.24, 0.24, 0.55, '#c86aff'));
      }
      g.add(skull(0.85, 0, 2.32, 0.28));
      return g;
    },
    cols: () => [[-0.82, 0, -0.45, 0.82, 2.25, 0.45]]
  };

  // 2) 枝形首级吊灯（Chandelier_01）：悬吊 6 颗首级在空中缓慢旋转，自带照明 + 范围光环
  C.head_chandelier = {
    cat: 'func', n: '枝形首级吊灯', icon: 'andeliers' ? '🕯️' : '🕯️', base: 2200, grow: 1.65, fp: [0.68, 0.68],
    stat: { soul: 5, ter: 3 }, depth: 2, light: '#ff9a4a', aura: 2.8, auraMul: 1.35,
    desc: '从洞顶铁链垂下的铸铁枝形吊灯，6 颗首级环绕灯盘悬空旋转（半径 2.8m 内产出 ×1.35）。每 12 秒 ×2.2 产出；把玩灯上任一首级会令整座吊灯摇晃并连锁触发全部灯位！',
    mount: {
      y: 1.52, period: 12, mult: 2.2, labelY: 2.28,
      slots: ring(6, 0.46, 1.52, a => Math.atan2(Math.cos(a), Math.sin(a)))
    },
    make() {
      const g = new THREE.Group();
      // 地面底座刻阵 + 悬垂铁链
      const rune = mesh(new THREE.RingGeometry(0.45, 0.54, 36), new THREE.MeshBasicMaterial({ color: '#ffb04a', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }), 0, 0.012, 0);
      rune.rotation.x = -Math.PI / 2; g.add(rune);
      const rig = new THREE.Group(); rig.position.y = 2.25; g.add(rig);
      rig.add(cyl(0.02, 0.02, 1.4, M.iron, 0, 0.7, 0, 6));
      rig.add(PM('Chandelier_01', { scale: 1.35, pos: [0, 0, 0] }));
      for (let i = 0; i < 6; i++) {
        const a = (i + 0.5) / 6 * Math.PI * 2;
        const x = Math.cos(a) * 0.46, z = Math.sin(a) * 0.46;
        rig.add(cyl(0.012, 0.016, 0.18, M.gold, x, -0.68, z, 6));
        rig.add(flame(x * 0.72, -0.42, z * 0.72, 0.65, i % 2 ? '#ff9a3a' : '#c07aff'));
      }
      g.userData.chandelierRig = rig;
      g.userData.swingV = 0; g.userData.swingA = 0;
      return g;
    },
    cols: () => [[-0.25, 1.35, -0.25, 0.25, 2.35, 0.25]]
  };

  // 3) 百首博古架（wooden_display_shelves_01）：8 槽位高容量展示架 + 多米诺魂浪
  C.curio_shelf = {
    cat: 'func', n: '百首博古架', icon: '📚', base: 1800, grow: 1.6, fp: [0.68, 0.32],
    stat: { soul: 4, agi: 2 }, depth: 2, showcase: true,
    desc: '四层八格古董博古架，单座建筑即可收纳陈列 8 颗首级（展厅分 ×1.6）！每 15 秒触发「多米诺魂浪」从下至上依次引爆，空手按 E 可立即掀起一次魂浪（冷却 15 秒）',
    mount: {
      y: 1.2, period: 15, mult: 1.75, labelY: 1.95,
      slots: [
        [-0.32, 0.46, 0.02, 0], [0.32, 0.46, 0.02, 0],
        [-0.32, 0.81, 0.02, 0], [0.32, 0.81, 0.02, 0],
        [-0.32, 1.16, 0.02, 0], [0.32, 1.16, 0.02, 0],
        [-0.32, 1.58, 0.02, 0], [0.32, 1.58, 0.02, 0]
      ]
    },
    make() {
      const g = new THREE.Group();
      g.add(PM('wooden_display_shelves_01', { scale: [1.18, 1.02, 1.15] }));
      for (const y of [0.44, 0.79, 1.14, 1.56]) {
        for (const x of [-0.32, 0.32]) {
          const pad = cyl(0.11, 0.12, 0.02, std('#5a0e18', { roughness: 0.85 }), x, y, 0.02, 16);
          g.add(pad);
        }
      }
      g.add(flame(-0.58, 1.60, 0.12, 0.5, '#ffd07a'));
      g.add(flame(0.58, 1.60, 0.12, 0.5, '#ffd07a'));
      return g;
    },
    cols: () => [[-0.64, 0, -0.24, 0.64, 1.65, 0.24]]
  };

  // 4) 哥特雕花供案（GothicCommode_01 + ornate_mirror_01）：4 槽位魔镜供案，自照残魂触发残响
  C.gothic_commode = {
    cat: 'func', n: '魔镜雕花供案', icon: '🪞', base: 1600, grow: 1.6, fp: [0.66, 0.38],
    stat: { soul: 5 }, depth: 2,
    desc: '哥特雕花供案配鎏金魔镜，可摆放 4 颗首级直面镜中死颜。每 16 秒 ×2.6 产出，并令供案上的首级进入「镜花残响（产出 ×2）」状态；空手按 E 可强行唤醒魔镜照魂',
    mount: {
      y: 1.24, period: 16, mult: 2.6, labelY: 2.05,
      slots: [
        [-0.42, 1.23, 0.05, 0], [-0.14, 1.23, 0.08, 0],
        [0.14, 1.23, 0.08, 0], [0.42, 1.23, 0.05, 0]
      ]
    },
    make() {
      const g = new THREE.Group();
      g.add(PM('GothicCommode_01', { scale: 1.0 }));
      g.add(PM('ornate_mirror_01', { scale: 1.15, pos: [0, 1.22, -0.22] }));
      // 镜面幽光层
      const glass = mesh(new THREE.PlaneGeometry(0.42, 0.68), new THREE.MeshBasicMaterial({ color: '#8a5aff', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), 0, 1.64, -0.20);
      g.add(glass); g.userData.mirrorGlow = glass;
      for (const sx of [-0.54, 0.54]) {
        g.add(cyl(0.02, 0.03, 0.16, M.gold, sx, 1.29, -0.12, 8));
        g.add(flame(sx, 1.38, -0.12, 0.55, '#b87aff'));
      }
      return g;
    },
    cols: () => [[-0.62, 0, -0.32, 0.62, 1.25, 0.32]]
  };

  // 5) 大理石无头胸像座（marble_bust_01 切颈版）：把任意女角色首级嫁接到古典大理石胸像肩颈上！
  C.bust_pedestal = {
    cat: 'func', n: '无头大理石胸像', icon: '🗿', base: 650, grow: 1.5, fp: [0.34, 0.34],
    stat: { soul: 2, ter: 2 }, depth: 1, showcase: true,
    desc: '古典雕花大理石胸像（已在颈部平整截断）：放上一颗首级即可严丝合缝嫁接成完整的古典少女胸像！展厅分 ×1.6，每 13 秒 ×3.0 产出；空手按 E 切换胸像展览姿态并触发咏叹',
    mount: {
      y: 1.19, period: 13, mult: 3.0, labelY: 1.75,
      slots: [[-0.03, 1.205, 0.045, 0]]
    },
    make() {
      const g = new THREE.Group();
      // 罗马柱式底座
      g.add(cyl(0.28, 0.32, 0.12, M.stone, 0, 0.06, 0, 20));
      g.add(cyl(0.20, 0.22, 0.56, M.stone, 0, 0.40, 0, 16));
      g.add(cyl(0.28, 0.22, 0.10, M.stone, 0, 0.73, 0, 20));
      g.add(cyl(0.25, 0.25, 0.02, M.gold, 0, 0.79, 0, 24));
      const bust = PM('marble_bust_01', { scale: 1.45, pos: [0, 0.78, 0] });
      g.add(bust);
      // 颈部嫁接金环
      const collar = mesh(new THREE.TorusGeometry(0.065, 0.012, 8, 24), M.gold, -0.03, 1.185, 0.045);
      collar.rotation.x = Math.PI / 2; g.add(collar);
      g.userData.bustPose = 0;
      return g;
    },
    cols: () => [[-0.3, 0, -0.3, 0.3, 1.18, 0.3]]
  };

  // 6) 无头圣女石像（gothic_statue 切颈版）：把首级安在等身哥特长袍石像脖子上！
  C.headless_statue = {
    cat: 'func', n: '无头圣女石像', icon: '🗽', base: 3200, grow: 1.7, fp: [0.62, 0.62],
    stat: { soul: 6, ter: 5 }, depth: 3, showcase: true,
    desc: '从修道院抢来的等身哥特长袍石像（已被斩去石首）：将收集的首级安在石像颈口，化作诡异的活首石像！每 18 秒 ×4.8 产出（修女/圣女/公主/骑士身份额外 ×1.5）；空手按 E 进行「亵渎礼拜」',
    mount: {
      y: 1.50, period: 18, mult: 4.8, labelY: 2.05,
      slots: [[0, 1.515, 0, 0]]
    },
    make() {
      const g = new THREE.Group();
      g.add(cyl(0.58, 0.65, 0.10, M.dark, 0, 0.05, 0, 8));
      g.add(PM('gothic_statue', { scale: 1.0, pos: [-0.059, 0.08, -0.318] }));
      const neckRing = mesh(new THREE.TorusGeometry(0.075, 0.014, 8, 24), M.gold, 0, 1.49, 0);
      neckRing.rotation.x = Math.PI / 2; g.add(neckRing);
      for (const sx of [-0.46, 0.46]) {
        g.add(cyl(0.025, 0.03, 0.22, M.iron, sx, 0.21, 0.36, 8));
        g.add(flame(sx, 0.34, 0.36, 0.7, '#7ad0ff'));
      }
      return g;
    },
    cols: () => [[-0.5, 0, -0.5, 0.5, 1.5, 0.5]]
  };

  // 7) 传世古董魂瓮（antique_ceramic_vase_01）：3 尊古董花瓶，把首级当花朵插在瓶口酝酿魂露！
  C.soul_urns = {
    cat: 'func', n: '人头花瓶·魂瓮台', icon: '🏺', base: 950, grow: 1.55, fp: [0.65, 0.35],
    stat: { soul: 3, con: 2 }, depth: 1,
    desc: '三尊精美的传世青花与鎏金古董花瓶——把首级像插花一样堵在瓶口！每 11 秒 ×1.6 产出并积攒「魂露」；空手按 E 痛饮瓶中魂露，立即收取大量额外魂晶并恢复 18% 生命！',
    mount: {
      y: 0.96, period: 11, mult: 1.6, labelY: 1.55,
      slots: [[-0.42, 0.90, 0, 0], [0, 0.98, 0, 0], [0.42, 0.90, 0, 0]]
    },
    make() {
      const g = new THREE.Group();
      g.add(box(1.24, 0.44, 0.52, M.dark, 0, 0.22, 0));
      g.add(box(1.30, 0.04, 0.58, M.gold, 0, 0.45, 0));
      [[-0.42, 0.44, 1.0, null], [0, 0.52, 1.05, '#ffe0a0'], [0.42, 0.44, 1.0, '#d8b0ff']].forEach(([x, y, sc, tint], i) => {
        if (i === 1) g.add(cyl(0.16, 0.18, 0.08, M.stone, 0, 0.48, 0, 14));
        g.add(PM('antique_ceramic_vase_01', { scale: sc, pos: [x, y, 0], tint }));
        const rim = mesh(new THREE.TorusGeometry(0.065, 0.01, 6, 20), M.gold, x, y + 0.44 * sc, 0);
        rim.rotation.x = Math.PI / 2; g.add(rim);
      });
      g.userData.dew = 0;
      return g;
    },
    cols: () => [[-0.64, 0, -0.28, 0.64, 0.95, 0.28]]
  };

  // 8) 腌渍魂桶阵（wine_barrel_01 敞口版）：3 口橡木桶装满发光福尔马林魂液，首级浮在桶里上下漂浮，越泡越值钱！
  C.pickle_barrels = {
    cat: 'func', n: '腌渍魂桶阵', icon: '🛢️', base: 1350, grow: 1.6, fp: [0.95, 0.52],
    stat: { con: 4, soul: 3 }, depth: 2,
    desc: '三口敞口橡木酒桶，灌满幽绿防腐魂液。放入的首级会在液体里轻轻漂浮，随浸泡时间（最高 5 分钟）产出倍率从 ×1.8 递增至 ×4.2！空手按 E 搅动木桶立即榨取一次陈年魂液',
    mount: {
      y: 0.84, period: 12, mult: 1.8, labelY: 1.45,
      slots: [[-0.62, 0.84, 0.05, 0], [0, 0.88, -0.05, 0], [0.62, 0.84, 0.05, 0]]
    },
    make() {
      const g = new THREE.Group();
      const cols = ['#4aff9a', '#a86aff', '#4ad8ff'];
      [[-0.62, 0.05, 0.92], [0, -0.05, 0.97], [0.62, 0.05, 0.92]].forEach(([x, z, sc], i) => {
        g.add(PM('wine_barrel_01', { scale: sc, pos: [x, 0, z] }));
        const liq = mesh(new THREE.CircleGeometry(0.28 * sc, 24), new THREE.MeshStandardMaterial({
          color: cols[i], emissive: cols[i], emissiveIntensity: 0.45, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.82
        }), x, 0.78 * sc, z);
        liq.rotation.x = -Math.PI / 2; g.add(liq);
      });
      g.userData.pickleTime = [0, 0, 0];
      return g;
    },
    cols: () => [[-0.95, 0, -0.42, 0.95, 0.88, 0.42]]
  };

  // 9) 万首寒铁冰窖（large_iron_gate，关联 Unlocks.R.vault）：4 根冰晶柱展示 + 魂库全局加成！
  C.vault = {
    cat: 'func', n: '万首冰窖', icon: '❄️', base: 3600, grow: 2.2, max: 1, fp: [1.35, 0.48],
    stat: { con: 5, soul: 6, ter: 4 }, depth: 3,
    desc: '铸铁大门封锁的地下寒冰窖：门前 4 根寒冰柱可冻存展示 4 颗首级（每 14 秒 ×2.8 产出）；建成后，魂库（K 键）中每存放 10 颗首级，全洞窟产出永久 +2%（最高 +120%）！对准冰窖大门按 E 直接打开魂库管理',
    mount: {
      y: 1.16, period: 14, mult: 2.8, labelY: 2.1,
      slots: [[-1.05, 1.16, 0.28, 0], [-0.42, 1.04, 0.32, 0], [0.42, 1.04, 0.32, 0], [1.05, 1.16, 0.28, 0]]
    },
    make() {
      const g = new THREE.Group();
      g.add(box(2.6, 0.14, 0.75, M.dark, 0, 0.07, 0));
      g.add(PM('large_iron_gate', { scale: [0.85, 0.78, 1.0], pos: [0, 0.12, -0.22] }));
      const iceMat = new THREE.MeshStandardMaterial({ color: '#8ae8ff', emissive: '#1a6a9a', emissiveIntensity: 0.45, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.86 });
      [[-1.05, 1.02, 0.28], [-0.42, 0.90, 0.32], [0.42, 0.90, 0.32], [1.05, 1.02, 0.28]].forEach(([x, h, z]) => {
        g.add(cyl(0.11, 0.15, h, iceMat, x, h / 2 + 0.12, z, 7));
      });
      for (const sx of [-1.22, 1.22]) g.add(flame(sx, 1.85, -0.1, 0.9, '#6ae0ff'));
      return g;
    },
    cols: () => [[-1.3, 0, -0.35, 1.3, 2.3, 0.38]]
  };

  // =========================================================================
  // 解锁条件注册（接入 Unlocks.R，未达条件显示 ???，达成后弹窗说明原因）
  // =========================================================================
  function registerUnlocks() {
    if (!window.Unlocks || !Unlocks.R) return;
    const R = Unlocks.R;
    const H = S => S.heads.length, E = S => (S.stats && S.stats.earned) || 0, T = S => (S.stats && S.stats.trips) || 0, P = S => (S.stats && S.stats.pokes) || 0;
    R.bust_pedestal  = [S => H(S) >= 2, '你看着手里的首级，忽然想给她配一具冰冷的大理石肩膀。'];
    R.soul_urns      = [S => H(S) >= 3, '三尊抢来的古董花瓶空着也是空着——不如拿来插头。'];
    R.gothic_cabinet = [S => H(S) >= 5, '首级渐渐多了起来，你需要一座带双层隔板的哥特雕花大橱柜。'];
    R.curio_shelf    = [S => H(S) >= 7, '7 颗首级摆在地上太乱了，八格博古架能把她们排得整整齐齐。'];
    R.gothic_commode = [S => H(S) >= 6 && E(S) >= 800, '你在战利品里翻出一面鎏金魔镜——要是让首级们整日盯着镜中的自己呢？'];
    R.head_chandelier = [S => S.depth >= 2 && H(S) >= 6, '抬头望向第二层高耸的洞顶，你萌生了造一盏「六首枝形吊灯」的恶趣味念头。'];
    R.pickle_barrels = [S => S.depth >= 2 && T(S) >= 2, '地精斯尼克卖给你几桶防腐秘药：「泡在橡木桶里的头，越陈越香！」'];
    R.headless_statue = [S => S.depth >= 3 && H(S) >= 10, '你从修道院废墟拖回一尊无头石像——洞里的首级终于有身体可嫁接了。'];
  }
  registerUnlocks();

  // =========================================================================
  // 动态动画与交互钩子（G.HOOK）
  // =========================================================================
  const UP = new V3(0, 1, 0);
  const NOBLE_IDS = /nun|saint|priest|paladin|princess|queen|knight|noble|valkyrie|angel|bishop/i;

  function tickSanctum(dt, now) {
    if (!window.G || !G.builds) return;
    for (const b of G.builds) {
      // 1) 枝形首级吊灯：整体缓慢旋转 + 受击摇摆，带动 6 颗首级同步旋转
      if (b.type === 'head_chandelier') {
        const rig = b.g.userData.chandelierRig;
        if (rig) {
          b.g.userData.swingV = (b.g.userData.swingV || 0) - (b.g.userData.swingA || 0) * 14 * dt;
          b.g.userData.swingV *= Math.pow(0.25, dt);
          b.g.userData.swingA = (b.g.userData.swingA || 0) + b.g.userData.swingV * dt;
          const baseYaw = now * 0.42 + b.x;
          rig.rotation.y = baseYaw;
          rig.rotation.z = Math.sin(now * 3.2) * 0.02 + (b.g.userData.swingA || 0);
          if (b.heads) {
            for (let i = 0; i < b.heads.length; i++) {
              const h = b.heads[i];
              if (!h || h === G.held) continue;
              const a = (i + 0.5) / 6 * Math.PI * 2 + baseYaw - b.rot * Math.PI / 2;
              const r = 0.46, swayX = Math.sin(rig.rotation.z) * 0.35;
              const m = h.hb.meta || {}, cut = m.cut || { x: 0, y: -0.1, z: 0 };
              h.g.quaternion.setFromEuler(new THREE.Euler(rig.rotation.z * 0.6, Math.atan2(Math.cos(a), Math.sin(a)), 0, 'YXZ'));
              const so = new V3((cut.x || 0) * 1.55, (cut.y != null ? cut.y : -0.1) * 1.55 - 0.005, (cut.z || 0) * 1.55).applyQuaternion(h.g.quaternion);
              h.g.position.set(b.x + Math.cos(a) * r + swayX - so.x, 1.50 - so.y, b.z + Math.sin(a) * r - so.z);
            }
          }
        }
      }
      // 2) 腌渍魂桶阵：桶中首级上下轻轻漂浮 + 累积浸泡时长倍率
      else if (b.type === 'pickle_barrels' && b.heads) {
        const pt = b.g.userData.pickleTime || (b.g.userData.pickleTime = [0, 0, 0]);
        const slots = C.pickle_barrels.mount.slots;
        for (let i = 0; i < 3; i++) {
          const h = b.heads[i];
          if (!h || h === G.held) { pt[i] = 0; continue; }
          pt[i] = Math.min(300, (pt[i] || 0) + dt);
          const s = slots[i], a = -b.rot * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a);
          const bob = Math.sin(now * 2.2 + i * 2.1) * 0.028;
          const tilt = Math.sin(now * 1.6 + i) * 0.12;
          h.g.quaternion.setFromEuler(new THREE.Euler(tilt * 0.6, -b.rot * Math.PI / 2 + Math.sin(now * 0.7 + i) * 0.35, tilt));
          const m = h.hb.meta || {}, cut = m.cut || { x: 0, y: -0.1, z: 0 };
          const so = new V3((cut.x || 0) * 1.55, (cut.y != null ? cut.y : -0.1) * 1.55 - 0.005, (cut.z || 0) * 1.55).applyQuaternion(h.g.quaternion);
          h.g.position.set(b.x + s[0] * c + s[2] * sn - so.x, s[1] - 0.02 + bob - so.y, b.z - s[0] * sn + s[2] * c - so.z);
          if (Math.random() < dt * 1.8) G.burst(h.g.position.clone().add(new V3(0, -0.05, 0)), ['#4aff9a', '#a86aff', '#4ad8ff'][i], 1, 0.35, 0.6, 0.8);
        }
      }
      // 3) 传世古董魂瓮：插着首级时自动积攒「魂露」
      else if (b.type === 'soul_urns' && b.heads) {
        const cnt = b.heads.filter(Boolean).length;
        if (cnt > 0) {
          b.g.userData.dew = Math.min(100, (b.g.userData.dew || 0) + dt * cnt * 1.6);
        }
      }
      // 4) 魔镜雕花供案：镜面流光 + 定期为供案上的首级施加残响 ×2
      else if (b.type === 'gothic_commode') {
        if (b.g.userData.mirrorGlow) b.g.userData.mirrorGlow.material.opacity = 0.16 + Math.sin(now * 2.5) * 0.08;
        if (b.heads && b.timer < 0.15) {
          for (const h of b.heads) if (h) h.buff = Math.max(h.buff || 0, now + 18);
        }
      }
    }
  }

  function onInteractE(hit, held, pickup) {
    const b = hit && hit.build;
    if (!b || held || pickup) return false;
    const now = G.clock.elapsedTime;
    // 1) 哥特藏首橱：开柜巡礼
    if (b.type === 'gothic_cabinet') {
      const hs = (b.heads || []).filter(Boolean);
      if (!hs.length) return false;
      if (b._cd && now < b._cd) {
        G.toast(`🗄️ 开柜巡礼冷却中（${Math.ceil(b._cd - now)}秒）`, '#ccc', 1.5);
        return true;
      }
      b._cd = now + 18;
      const divBonus = 1 + new Set(hs.map(h => h.rec.c.id)).size * 0.25;
      let total = 0;
      hs.forEach((h, idx) => {
        setTimeout(() => {
          if (!G.heads.includes(h)) return;
          total += G.trigger(h, 'manual', 2.2 * divBonus);
          h.wob = 1; h.wobA = (idx % 2 ? 1 : -1) * 1.5;
          G.burst(h.g.position, '#d88aff', 18, 1.4, 0.8, 0.5);
        }, idx * 110);
      });
      SFX.fanfare(Math.min(3, hs.length >> 1));
      G.toast(`🗄️ <b>开柜巡礼</b>：${hs.length} 颗首级在橱窗内齐齐颤栗，身份共鸣 ×${(2.2 * divBonus).toFixed(2)}！`, '#e0b0ff', 3.2);
      return true;
    }
    // 2) 百首博古架：多米诺魂浪
    if (b.type === 'curio_shelf') {
      const hs = (b.heads || []).filter(Boolean);
      if (!hs.length) return false;
      if (b._cd && now < b._cd) {
        G.toast(`📚 多米诺魂浪冷却中（${Math.ceil(b._cd - now)}秒）`, '#ccc', 1.5);
        return true;
      }
      b._cd = now + 15;
      hs.forEach((h, idx) => {
        setTimeout(() => {
          if (!G.heads.includes(h)) return;
          G.trigger(h, 'chain', 1.5 + idx * 0.25);
          h.squash = 1;
          SFX.soul(idx, h.rec.c.rar);
        }, idx * 95);
      });
      G.toast(`📚 <b>多米诺魂浪</b>：${hs.length} 格藏品层层引爆！`, '#ffd88a', 2.8);
      return true;
    }
    // 3) 传世古董魂瓮：饮用魂露
    if (b.type === 'soul_urns') {
      const dew = Math.floor(b.g.userData.dew || 0);
      const hs = (b.heads || []).filter(Boolean);
      if (dew < 15) {
        G.toast(`🏺 瓶中魂露尚浅（${dew}%，满 15% 可饮用）——多插几颗首级酿得更快`, '#a8d8ff', 2.2);
        return true;
      }
      b.g.userData.dew = 0;
      let sum = 0;
      for (const h of hs) sum += G.trigger(h, 'manual', (dew / 22));
      const maxHp = G.st().maxHp, heal = Math.max(5, Math.round(maxHp * 0.18 * (dew / 100)));
      G.S.hp = Math.min(maxHp, G.S.hp + heal);
      G.flash('#3aff9a'); SFX.fanfare(2);
      G.toast(`🏺 你仰头饮尽古董瓶中酿出的<b>魂露（${dew}%）</b>：+${fmt(sum)} 魂晶，生命恢复 +${heal}！`, '#7affb8', 3.5);
      return true;
    }
    // 4) 腌渍魂桶阵：搅桶榨取陈年魂液
    if (b.type === 'pickle_barrels') {
      const hs = (b.heads || []).filter(Boolean);
      if (!hs.length) return false;
      if (b._cd && now < b._cd) {
        G.toast(`🛢️ 魂桶正在回酿（${Math.ceil(b._cd - now)}秒）`, '#ccc', 1.5);
        return true;
      }
      b._cd = now + 16;
      const pt = b.g.userData.pickleTime || [0, 0, 0];
      let sum = 0;
      b.heads.forEach((h, i) => {
        if (!h) return;
        const ageMul = 1.8 + Math.min(2.4, (pt[i] || 0) / 125);
        sum += G.trigger(h, 'manual', ageMul);
        G.burst(h.g.position, '#4aff9a', 22, 1.5, 0.8, 0.5);
      });
      SFX.play('squish', 0.6, 0.9);
      G.toast(`🛢️ 搅动腌渍魂桶：陈年魂液翻涌，榨出 +${fmt(sum)} 魂晶！`, '#6affb0', 2.8);
      return true;
    }
    // 5) 无头大理石胸像 / 无头圣女石像：切换雕塑姿态 & 亵渎咏叹
    if (b.type === 'bust_pedestal' || b.type === 'headless_statue') {
      const h = b.heads && b.heads[0];
      if (!h) return false;
      b.g.userData.bustPose = ((b.g.userData.bustPose || 0) + 1) % 4;
      const poses = [
        ['端庄直视', 0, 0],
        ['微仰圣洁', -0.22, 0.18],
        ['垂首哀怜', 0.24, -0.18],
        ['侧首斜睨', -0.08, 0.42]
      ];
      const [pName, rx, ry] = poses[b.g.userData.bustPose];
      h.g.quaternion.setFromEuler(new THREE.Euler(rx, -b.rot * Math.PI / 2 + ry, 0, 'YXZ'));
      const isNoble = NOBLE_IDS.test(h.rec.c.id || '') || /修女|圣女|公主|骑士|贵族|女皇|王女/.test(h.rec.c.idN || '');
      const mul = (b.type === 'headless_statue' ? 3.2 : 2.0) * (isNoble ? 1.5 : 1);
      if (!b._cd || now >= b._cd) {
        b._cd = now + 12;
        const v = G.trigger(h, 'manual', mul);
        G.toast(`🗽 雕像姿态切换为「${pName}」${isNoble ? ' · 圣洁身份亵渎加成 ×1.5' : ''} · +${fmt(v)} 魂晶`, '#ffd890', 2.6);
      } else {
        G.toast(`🗽 雕像姿态切换为「${pName}」`, '#e6c7a0', 1.4);
      }
      SFX.click();
      return true;
    }
    // 6) 魔镜雕花供案：魔镜照魂
    if (b.type === 'gothic_commode') {
      const hs = (b.heads || []).filter(Boolean);
      if (!hs.length) return false;
      if (b._cd && now < b._cd) {
        G.toast(`🪞 魔镜充能中（${Math.ceil(b._cd - now)}秒）`, '#ccc', 1.5);
        return true;
      }
      b._cd = now + 16;
      hs.forEach(h => {
        h.buff = now + 25;
        G.trigger(h, 'manual', 2.0);
        G.floatText('🪞 镜花残响 ×2', h.g.position.clone().add(new V3(0, 0.45, 0)), '#d89aff', 16);
      });
      SFX.play('bell', 0.5, 1.2);
      G.toast(`🪞 魔镜映出 ${hs.length} 颗首级生前的倒影，全员进入 25 秒「残响 ×2」！`, '#d89aff', 3);
      return true;
    }
    // 7) 万首冰窖：打开魂库界面
    if (b.type === 'vault') {
      if (window.UI && UI.openMenu) { UI.openMenu('heads'); return true; }
    }
    return false;
  }

  function onTip(hit, held) {
    const b = hit && hit.build;
    if (!b || held) return null;
    const hs = (b.heads || []).filter(Boolean);
    if (b.type === 'gothic_cabinet' && hs.length && !hit.head)
      return `<b>🗄️ 哥特藏首橱</b>（${hs.length}/6 位） · <b>[E]</b> 开柜巡礼（全体共鸣爆发） · 手持首级按 E 放入`;
    if (b.type === 'curio_shelf' && hs.length && !hit.head)
      return `<b>📚 百首博古架</b>（${hs.length}/8 位） · <b>[E]</b> 掀起多米诺魂浪`;
    if (b.type === 'soul_urns' && !hit.head)
      return `<b>🏺 人头花瓶·魂瓮台</b>（${hs.length}/3 位 · 魂露 ${Math.floor(b.g.userData.dew || 0)}%） · <b>[E]</b> 痛饮魂露（恢复生命+爆魂晶）`;
    if (b.type === 'pickle_barrels' && hs.length && !hit.head) {
      const pt = b.g.userData.pickleTime || [0, 0, 0];
      const maxM = Math.max(...b.heads.map((h, i) => h ? 1.8 + Math.min(2.4, (pt[i] || 0) / 125) : 1.8));
      return `<b>🛢️ 腌渍魂桶阵</b>（${hs.length}/3 位 · 当前最高陈酿 ×${maxM.toFixed(2)}） · <b>[E]</b> 搅桶榨取`;
    }
    if ((b.type === 'bust_pedestal' || b.type === 'headless_statue') && hs.length && !hit.head)
      return `<b>🗽 ${C[b.type].n}</b>（已嫁接「${hs[0].NM(rec.c)}」） · <b>[E]</b> 切换雕像姿态 / 亵渎咏叹`;
    if (b.type === 'gothic_commode' && hs.length && !hit.head)
      return `<b>🪞 魔镜雕花供案</b>（${hs.length}/4 位） · <b>[E]</b> 魔镜照魂（全体残响 ×2）`;
    if (b.type === 'vault' && !hit.head) {
      const vc = G.vaultCount ? G.vaultCount() : 0;
      const bonus = Math.min(120, Math.floor(vc / 10) * 2);
      return `<b>❄️ 万首冰窖</b>（冰柱 ${hs.length}/4 · 魂库藏首 ${vc} 颗 → 全局产出 +${bonus}%） · <b>[E]</b> 打开魂库`;
    }
    return null;
  }

  function initHooks() {
    const wait = setInterval(() => {
      if (!window.G || !G.HOOK) return;
      clearInterval(wait);
      G.HOOK.frame.push(tickSanctum);
      G.HOOK.e.push(onInteractE);
      G.HOOK.tip.push(onTip);
      // 枝形首级吊灯被左键把玩时摇晃并连锁触发灯上其余首级
      G.HOOK.click.push(() => {
        if (G.held) return false;
        const hit = G.lookHit && G.lookHit();
        const h = hit && hit.head;
        if (h && h.mount && h.mount.type === 'head_chandelier') {
          const b = h.mount;
          b.g.userData.swingV = (b.g.userData.swingV || 0) + (Math.random() < 0.5 ? 0.45 : -0.45);
          const others = b.heads.filter(o => o && o !== h);
          others.forEach((o, i) => setTimeout(() => { if (G.heads.includes(o)) G.trigger(o, 'chain', 1.15); }, 70 + i * 60));
        }
        return false;
      });
      // 万首冰窖全局加成接入 Play.mul
      if (window.Play && Play.mul) {
        const origMul = Play.mul;
        Play.mul = () => {
          let m = origMul();
          if (G.builds && G.builds.some(b => b.type === 'vault')) {
            const vc = G.vaultCount ? G.vaultCount() : 0;
            m *= 1 + Math.min(1.2, Math.floor(vc / 10) * 0.02);
          }
          return m;
        };
      }
      if (window.Unlocks && Unlocks.scan) Unlocks.scan(true);
    }, 150);
  }
  initHooks();

  return { registerUnlocks };
})();
