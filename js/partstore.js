// R55 MOD part_editor（默认关）· 数据层 + 模型解析 + 模型/贴图检查。界面在 partedit.js。
// 格式：.glb / .gltf（含外部 .bin 与贴图）/ .obj（+ .mtl + 贴图）/ .stl。.fbx 与 .blend 需先转成 glb。
// 存储：浏览器 IndexedDB（立刻生效）+ 可「保存到游戏目录」写成 assets/custom_parts/*.js（file:// 双击也能读）。
window.PartStore = (() => {
  const DB = 'soulhead_parts', ST = 'parts', NOM = { limb: 0.17, organ: 0.11 };
  const recs = new Map(), cache = new Map(), orig = {}; let pv = null, ready = false, db = null;
  const modOn = () => !!(window.Mods && Mods.on('part_editor'));
  const keyOf = r => r.replaces || 'cp_' + r.id;
  const base = n => String(n).split(/[\\/]/).pop().toLowerCase();
  const ext = n => (/\.([a-z0-9]+)$/i.exec(n) || [, ''])[1].toLowerCase();
  const IMG = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp' };
  const MODEL = ['glb', 'gltf', 'obj', 'stl'];
  // ---------- IndexedDB ----------
  function idb() { return db ? Promise.resolve(db) : new Promise((ok, no) => { try { const q = indexedDB.open(DB, 1); q.onupgradeneeded = () => q.result.createObjectStore(ST, { keyPath: 'id' }); q.onsuccess = () => ok(db = q.result); q.onerror = () => no(q.error); } catch (e) { no(e); } }); }
  const tx = (m, f) => idb().then(d => new Promise((ok, no) => { const t = d.transaction(ST, m), r = f(t.objectStore(ST)); t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); }));
  const dbAll = () => tx('readonly', s => s.getAll()), dbPut = r => tx('readwrite', s => s.put(r)), dbDel = id => tx('readwrite', s => s.delete(id));
  // ---------- base64 / 静态数据 ----------
  const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return u.buffer; };
  function loadStatic(m) { return new Promise((ok, no) => { const D = (window.CUSTOM_PART_DATA = window.CUSTOM_PART_DATA || {}); const fin = () => D[m.id] ? ok(D[m.id].map(f => ({ name: f.name, buf: unb64(f.b64) }))) : no(new Error('缺少数据 ' + m.id)); if (D[m.id]) return fin(); const s = document.createElement('script'); s.src = 'assets/custom_parts/' + m.id + '.js'; s.onload = fin; s.onerror = () => no(new Error('读不到 assets/custom_parts/' + m.id + '.js')); document.head.appendChild(s); }); }
  // ---------- 解析器 ----------
  const sRGB = t => { if (t) t.encoding = THREE.sRGBEncoding; return t; };
  function texFrom(url) { return new Promise(ok => { new THREE.TextureLoader().load(url, t => ok(sRGB(t)), undefined, () => ok(null)); }); }
  function parseMTL(txt) { const M = {}; let c = null; for (const raw of txt.split(/\r?\n/)) { const l = raw.trim(); if (!l || l[0] === '#') continue; const p = l.split(/\s+/), k = p[0].toLowerCase(); if (k === 'newmtl') c = M[p.slice(1).join(' ')] = { kd: [0.8, 0.8, 0.8], d: 1 }; else if (!c) continue; else if (k === 'kd') c.kd = p.slice(1, 4).map(Number); else if (k === 'd') c.d = +p[1]; else if (k === 'tr') c.d = 1 - p[1]; else if (k === 'map_kd') c.map = p[p.length - 1]; else if (k === 'map_bump' || k === 'bump') c.bump = p[p.length - 1]; } return M; }
  function parseOBJ(txt) { // → {mats:{name:{pos,uv,nrm}}, mtl:[libs]}
    const V = [], T = [], N = [], G = {}; let cur = 'default', libs = []; const bag = n => G[n] || (G[n] = { pos: [], uv: [], nrm: [], hasN: true });
    const idx = (s, n) => { const i = parseInt(s, 10); return i < 0 ? n + i : i - 1; };
    for (const raw of txt.split(/\r?\n/)) { const l = raw.trim(); if (!l || l[0] === '#') continue; const p = l.split(/\s+/), k = p[0];
      if (k === 'v') V.push([+p[1], +p[2], +p[3]]); else if (k === 'vt') T.push([+p[1], +p[2]]); else if (k === 'vn') N.push([+p[1], +p[2], +p[3]]);
      else if (k === 'usemtl') cur = p.slice(1).join(' '); else if (k === 'mtllib') libs.push(p.slice(1).join(' '));
      else if (k === 'f') { const vs = p.slice(1).map(t => { const a = t.split('/'); return [idx(a[0], V.length), a[1] ? idx(a[1], T.length) : -1, a[2] ? idx(a[2], N.length) : -1]; }); const b = bag(cur);
        for (let i = 1; i < vs.length - 1; i++) for (const q of [vs[0], vs[i], vs[i + 1]]) { const v = V[q[0]]; if (!v) continue; b.pos.push(v[0], v[1], v[2]); const t = T[q[1]]; b.uv.push(t ? t[0] : 0, t ? t[1] : 0); const n = N[q[2]]; if (n) b.nrm.push(n[0], n[1], n[2]); else b.hasN = false; b.hasUV = b.hasUV || !!t; } } }
    return { G, libs };
  }
  async function buildOBJ(files, imgUrl, rep) {
    const mf = files.find(f => ext(f.name) === 'obj'), o = parseOBJ(new TextDecoder().decode(mf.buf)); let mtl = {};
    const mtlF = files.filter(f => ext(f.name) === 'mtl'); const want = o.libs.map(base);
    if (o.libs.length && !mtlF.length) rep.push(['warn', '材质库缺失', 'OBJ 引用了 ' + o.libs.join('、') + '，但没有一起导入 .mtl —— 将用灰白色。']);
    for (const m of mtlF) { if (o.libs.length && !want.includes(base(m.name))) rep.push(['info', '多余的材质库', m.name + ' 没被 OBJ 引用']); Object.assign(mtl, parseMTL(new TextDecoder().decode(m.buf))); }
    const grp = new THREE.Group(); const miss = new Set();
    for (const [name, b] of Object.entries(o.G)) { if (!b.pos.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2)); if (b.hasN && b.nrm.length === b.pos.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm, 3)); else g.computeVertexNormals(); g.userData.noUV = !b.hasUV;
      const d = mtl[name] || { kd: [0.8, 0.78, 0.74], d: 1 }; const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(d.kd[0], d.kd[1], d.kd[2]), roughness: 0.75, metalness: 0.02, side: THREE.DoubleSide, name }); if (d.d < 1) { mat.transparent = true; mat.opacity = d.d; }
      if (d.map) { rep.used.add(base(d.map)); const u = imgUrl[base(d.map)]; if (u) { mat.map = await texFrom(u); if (mat.map) mat.color.set(0xffffff); } else miss.add(d.map); }
      grp.add(new THREE.Mesh(g, mat)); }
    for (const m of miss) rep.push(['err', '贴图缺失', m + '（.mtl 里引用了它，但没一起导入）']);
    return grp;
  }
  function buildSTL(files) {
    const f = files.find(x => ext(x.name) === 'stl'), buf = f.buf, dv = new DataView(buf), n = dv.getUint32(80, true); let pos = [];
    if (84 + n * 50 === buf.byteLength) { for (let i = 0; i < n; i++) { const o = 84 + i * 50 + 12; for (let k = 0; k < 9; k++) pos.push(dv.getFloat32(o + k * 4, true)); } }
    else { const t = new TextDecoder().decode(buf), re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g; let m; while ((m = re.exec(t))) pos.push(+m[1], +m[2], +m[3]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); const grp = new THREE.Group(); grp.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xcfc7b8, roughness: 0.7, side: THREE.DoubleSide }))); return grp;
  }
  function buildGLTF(files, imgUrl, rep) {
    return new Promise((ok, no) => {
      const mf = files.find(f => MODEL.includes(ext(f.name)) && ext(f.name).startsWith('gl')), res = {}; for (const f of files) if (f !== mf) res[base(f.name)] = f.name;
      const bin = {}; for (const f of files) if (ext(f.name) === 'bin') bin[base(f.name)] = URL.createObjectURL(new Blob([f.buf])); const urls = Object.assign({}, imgUrl, bin);
      const mgr = new THREE.LoadingManager(); mgr.setURLModifier(u => { if (/^(blob:|data:)/.test(u)) return u; const b = base(decodeURIComponent(u.split('?')[0])); rep.used.add(b); if (urls[b]) return urls[b]; rep.push(['err', '外部文件缺失', b + '（.gltf 引用了它，但没一起导入）']); return u; });
      new THREE.GLTFLoader(mgr).parse(ext(mf.name) === 'glb' ? mf.buf : new TextDecoder().decode(mf.buf), '', gl => { for (const u of Object.values(bin)) setTimeout(() => URL.revokeObjectURL(u), 8000); setTimeout(() => ok(gl.scene), 120); }, e => no(new Error('glTF 解析失败：' + (e && e.message || e))));
    });
  }
  // ---------- 检查 ----------
  const isP2 = n => n > 0 && (n & (n - 1)) === 0;
  function imgInfo(f) { return new Promise(ok => { const u = URL.createObjectURL(new Blob([f.buf], { type: IMG[ext(f.name)] })), im = new Image(); im.onload = () => ok({ f, u, w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => ok({ f, u, w: 0, h: 0, bad: true }); im.src = u; }); }
  async function load(files) { // → {group, rep:[[lvl,title,detail]], stats, imgs}
    const rep = []; rep.used = new Set(); rep.push = function () { Array.prototype.push.apply(this, arguments); }; const fmtF = files.filter(f => MODEL.includes(ext(f.name)));
    if (!fmtF.length) throw new Error('没有找到模型文件。支持 .glb .gltf .obj .stl（.fbx / .blend 请先在 Blender 里导出成 glb）。');
    const imgs = await Promise.all(files.filter(f => IMG[ext(f.name)]).map(imgInfo)), imgUrl = {}; for (const i of imgs) imgUrl[base(i.f.name)] = i.u;
    const mf = fmtF[0]; if (fmtF.length > 1) rep.push(['warn', '多个模型文件', '只用第一个：' + mf.name]); const fm = ext(mf.name);
    let group; if (fm === 'obj') group = await buildOBJ(files, imgUrl, rep); else if (fm === 'stl') group = buildSTL(files); else group = await buildGLTF(files, imgUrl, rep);
    // 统计
    let tris = 0, verts = 0, meshes = 0, noUV = 0, skinned = 0; const mats = new Set(), texs = new Set();
    group.traverse(o => { if (!o.isMesh) return; meshes++; if (o.isSkinnedMesh) skinned++; const g = o.geometry; verts += g.attributes.position.count; tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3; for (const m of [].concat(o.material)) { if (!m) continue; mats.add(m); for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap']) if (m[k]) { texs.add(m[k]); if (k === 'map' && !g.attributes.uv) noUV++; } } });
    const box = new THREE.Box3().setFromObject(group), size = box.getSize(new THREE.Vector3()), tot = files.reduce((a, f) => a + f.buf.byteLength, 0);
    const st = { fmt: fm, meshes, tris: Math.round(tris), verts, mats: mats.size, texs: texs.size, size: [size.x, size.y, size.z], bytes: tot };
    if (!meshes) rep.push(['err', '没有网格', '文件里读不到任何可渲染的网格。']);
    if (meshes && (!isFinite(size.x + size.y + size.z) || Math.max(size.x, size.y, size.z) <= 1e-9)) rep.push(['err', '尺寸为零', '包围盒是空的 / 无穷。']);
    if (tris > 60000) rep.push(['err', '面数过高', Math.round(tris) + ' 三角面 —— 这是桌面小摆件，建议 ≤ 20000。']); else if (tris > 20000) rep.push(['warn', '面数偏高', Math.round(tris) + ' 三角面，洞里摆很多件会卡。建议 ≤ 20000。']);
    if (skinned) rep.push(['info', '含骨骼蒙皮', skinned + ' 个蒙皮网格，将以静态姿势展示。']);
    if (noUV) rep.push(['err', '有贴图但没有 UV', noUV + ' 个网格带贴图却没有 UV 坐标，贴图会显示不出来。']);
    if (tot > 12e6) rep.push(['err', '文件过大', (tot / 1e6).toFixed(1) + ' MB —— 会撑爆仓库（上限 128MB）。请压缩贴图 / 减面。']); else if (tot > 4e6) rep.push(['warn', '文件偏大', (tot / 1e6).toFixed(1) + ' MB，base64 后再 +33%。']);
    for (const t of texs) { const im = t.image, w = im && (im.width || im.naturalWidth), h = im && (im.height || im.naturalHeight); if (!w) { rep.push(['err', '贴图未能读取', '某张贴图没有解码出图像。']); continue; } if (w > 4096 || h > 4096) rep.push(['err', '贴图过大', w + '×' + h + ' —— 超过 4096。']); else if (w > 2048 || h > 2048) rep.push(['warn', '贴图偏大', w + '×' + h + '，建议 ≤ 2048。']); if (!isP2(w) || !isP2(h)) rep.push(['warn', '贴图非 2 的幂', w + '×' + h + '（NPOT）：低端显卡上不能 mipmap，可能发糊。']); }
    for (const i of imgs) { if (i.bad) rep.push(['err', '图片损坏', i.f.name + ' 无法解码。']); else if (texs.size && !rep.used.has(base(i.f.name))) rep.push(['info', '未被模型引用的图片', i.f.name + '（' + i.w + '×' + i.h + '）—— glb 内嵌贴图时外部图片不会用到。']); else if (!texs.size && mats.size) rep.push(['info', '模型没有使用贴图', i.f.name + ' 被忽略。']); }
    if (!texs.size && meshes && !rep.some(r => r[0] === 'err')) rep.push(['info', '纯色材质', '模型没有贴图，只用材质颜色。']);
    if (!rep.some(r => r[0] !== 'info')) rep.unshift(['ok', '检查通过', '模型、贴图、面数与体积都在范围内。']);
    return { group, rep: Array.from(rep), stats: st, imgs: imgs.map(i => ({ name: i.f.name, w: i.w, h: i.h, bad: i.bad, url: i.u, used: rep.used.has(base(i.f.name)) })) };
  }
  // ---------- 变换 / 归一化 ----------
  function finalize(raw, rec) { // 旋转 → 居中 → 归一化到名义大小 → 用户缩放/偏移
    const tf = rec.tf || {}, rot = tf.rot || [0, 0, 0], inner = new THREE.Group(); inner.add(raw.clone(true)); inner.rotation.set(rot[0] * Math.PI / 180, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180); inner.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(inner), c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3()), mx = Math.max(sz.x, sz.y, sz.z) || 1;
    const holder = new THREE.Group(); inner.position.sub(c); holder.add(inner); const w = new THREE.Group(); w.add(holder); const s = (NOM[rec.cat] || 0.12) / mx * (tf.scale || 1); w.scale.setScalar(s); const o = tf.off || [0, 0, 0]; w.position.set(o[0] * 0.1, o[1] * 0.1, o[2] * 0.1);
    const out = new THREE.Group(); out.add(w); out.userData.nojar = rec.jar === false; return out;
  }
  // ---------- 注册 / 运行时 ----------
  function register(r) {
    const O = window.Organs; if (!O) return; const k = keyOf(r), d = O.OG[k];
    if (r.replaces) { if (d) { if (!orig[k]) orig[k] = { n: d.n }; if (r.name) d.n = r.name; } return; }
    const fx = r.fx || {}, tk = fx.tk && fx.tk.n ? { every: fx.tk.every || 50, kind: fx.tk.kind || 'dust', n: fx.tk.n } : undefined;
    O.OG[k] = { cat: r.cat === 'organ' ? 'organ' : 'limb', n: r.name || '自制部位', icon: r.icon || (r.cat === 'organ' ? '🫀' : '🦴'), st: fx.st && Object.keys(fx.st).length ? fx.st : undefined, au: fx.au || undefined, pk: fx.pk || undefined, tk, r: fx.r || undefined, p: r.dropP == null ? 0.7 : r.dropP, custom: 1, beast: !!r.beast, note: r.note || '你自己做的部位。' };
    if (!O.LIST.includes(k)) O.LIST.push(k); O.defsNow && O.defsNow();
  }
  function unregister(r) { const O = window.Organs, k = keyOf(r); if (!O) return; if (r.replaces) { if (orig[k]) { O.OG[k].n = orig[k].n; delete orig[k]; } } else { delete O.OG[k]; const i = O.LIST.indexOf(k); if (i >= 0) O.LIST.splice(i, 1); } cache.delete(k); }
  async function buildOne(r) { try { const files = r.files || await loadStatic(r); const L = await load(files); cache.set(keyOf(r), finalize(L.group, r)); } catch (e) { console.warn('PartStore: 构建失败', r.id, e); } }
  async function init() {
    if (ready || !modOn() || !window.Organs || !window.THREE) return; ready = true; recs.clear();
    for (const m of (window.CUSTOM_PARTS || [])) recs.set(m.id, Object.assign({ src: 'file' }, m));
    try { for (const r of await dbAll()) recs.set(r.id, Object.assign({ src: 'db' }, r)); } catch (e) { console.warn('PartStore IDB', e); }
    for (const r of recs.values()) { register(r); buildOne(r); }
  }
  const t0 = setInterval(() => { if (window.Organs && window.Mods && window.THREE) { clearInterval(t0); try { init(); } catch (e) { } } }, 600);
  return {
    NOM, MODEL, IMG, ext, base, b64, keyOf, load, finalize, register, unregister, loadStatic, dbPut, dbDel, dbAll, init, buildOne, recs, cache,
    get ready() { return ready; }, reinit() { ready = false; return init(); },
    setPreview(k, g) { pv = k ? { k, g } : null; },
    model(t) { if (pv && pv.k === t) return pv.g.clone(true); if (!modOn()) return null; const g = cache.get(t); return g ? g.clone(true) : null; }
  };
})();
