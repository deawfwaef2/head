// R55 MOD part_editor（默认关）· 残肢器官编辑器界面。只能从 MOD 面板里该 MOD 展开的「打开编辑器」按钮进入，且 MOD 必须已开启并应用。
// 左：现有肢体 / 内脏 / 自制部位；中：3D 预览（拖动旋转、滚轮缩放）+ 导入区 + 检查报告；右：名称、用途、显示方式、变换。
window.PartEdit = (() => {
  const PS = () => window.PartStore, O = () => window.Organs;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SN = { str: '💪力量', con: '❤️体魄', agi: '💨敏捷', ter: '👹胆魄', soul: '🔮魂力' };
  const TK = { dust: '魂尘', herb: '草药', coin: '魂晶', bone: '骨', iron: '铁' };
  let root = null, css = false, R = null, D = null, cur = null, busy = false, raf = 0, keyH = null; // R: 3D 预览；D: 当前草稿
  function addCss() { if (css) return; css = true; const s = document.createElement('style'); s.textContent = `
#peRoot{position:fixed;inset:0;z-index:140;display:flex;flex-direction:column;background:radial-gradient(ellipse at 30% 0,#2a1a22,#0b0709 70%);color:#eadfc8;font:17px/1.4 system-ui,"Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif}
#peRoot *{box-sizing:border-box}
#peRoot .tp{display:flex;align-items:center;gap:16px;padding:14px 24px;border-bottom:1px solid rgba(231,194,122,.4);background:rgba(0,0,0,.35)}
#peRoot h1{margin:0;font:900 clamp(26px,4vh,38px)/1 "Noto Serif CJK SC","Songti SC",serif;letter-spacing:.1em;color:#ffe2a8}#peRoot .tp .sub{color:#b5a78e;font-size:16px}
#peRoot .tp .sp{flex:1}
#peRoot button,#peRoot .bt{font:800 17px "Noto Serif CJK SC",serif;letter-spacing:.08em;padding:9px 20px;border:2px solid #b8914a;background:linear-gradient(180deg,#3a2a1a,#1d130b);color:#f3d9a0;cursor:pointer}
#peRoot button:hover{filter:brightness(1.25)}#peRoot button.pri{background:linear-gradient(180deg,#a8452c,#5a1a10);border-color:#ffb070;color:#fff}#peRoot button:disabled{opacity:.4;cursor:not-allowed}#peRoot button.sm{font-size:15px;padding:5px 12px}
#peRoot .mn{flex:1;display:grid;grid-template-columns:310px minmax(360px,1fr) 360px;min-height:0}
#peRoot .col{overflow:auto;padding:14px 16px;min-height:0}#peRoot .L{border-right:1px solid rgba(231,194,122,.25)}#peRoot .Rr{border-left:1px solid rgba(231,194,122,.25)}
#peRoot h3{margin:12px 0 8px;font:800 20px "Noto Serif CJK SC",serif;color:#f3d9a0;letter-spacing:.08em}#peRoot h3 small{font:15px system-ui;color:#9d917c;margin-left:8px}
#peRoot .it{display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:6px;border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);cursor:pointer}#peRoot .it:hover{border-color:rgba(255,210,122,.5)}#peRoot .it.on{border-color:#ffd27a;background:rgba(255,160,70,.14)}
#peRoot .it .ic{font-size:30px}#peRoot .it .nm{font-weight:800;font-size:18px;color:#fff}#peRoot .it .tg{font-size:14px;color:#a99d88}#peRoot .it .tg b{color:#9fe0a0}#peRoot .it .x{margin-left:auto;font-size:20px;color:#c66;padding:2px 8px}
#peRoot .vw{position:relative;height:42vh;min-height:260px;border:2px solid rgba(231,194,122,.35);background:#120d10}#peRoot canvas.pv{width:100%;height:100%;display:block;cursor:grab}
#peRoot .vw .ov{position:absolute;left:12px;top:10px;font-size:16px;color:#cdbfa6;text-shadow:0 1px 4px #000;pointer-events:none}
#peRoot .dz{margin:12px 0;padding:18px;border:3px dashed rgba(255,210,122,.5);text-align:center;background:rgba(255,200,120,.05);font-size:18px}#peRoot .dz.hv{background:rgba(255,200,120,.2);border-color:#ffd27a}#peRoot .dz small{display:block;font-size:15px;color:#a99d88;margin-top:6px}
#peRoot .rp{display:flex;gap:10px;align-items:flex-start;padding:9px 12px;margin-bottom:6px;border-left:6px solid #777;background:rgba(255,255,255,.05)}#peRoot .rp b{display:block;font-size:17px}#peRoot .rp span{font-size:15.5px;color:#cbbfa8}#peRoot .rp i{font-style:normal;font-size:24px}
#peRoot .rp.ok{border-color:#6fd27a}#peRoot .rp.warn{border-color:#f0b84a}#peRoot .rp.err{border-color:#ff6a5a;background:rgba(255,80,60,.1)}#peRoot .rp.info{border-color:#6aa8ff}
#peRoot .st{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0}#peRoot .st div{padding:8px;text-align:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}#peRoot .st b{display:block;font:900 24px "Noto Serif CJK SC",serif;color:#ffd27a}#peRoot .st span{font-size:14px;color:#a99d88}
#peRoot .th{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}#peRoot .th figure{margin:0;width:84px;font-size:13px;color:#b5a78e;text-align:center;word-break:break-all}#peRoot .th img{width:84px;height:84px;object-fit:cover;border:2px solid rgba(255,255,255,.2);background:repeating-conic-gradient(#333 0 25%,#222 0 50%) 0 0/16px 16px}
#peRoot label{display:block;margin:10px 0 4px;font-weight:800;color:#f3d9a0;font-size:16px}#peRoot label small{font-weight:400;color:#9d917c;margin-left:6px}
#peRoot input[type=text],#peRoot input[type=number],#peRoot select{width:100%;font:17px system-ui;padding:8px 10px;color:#fff;background:#1a1216;border:2px solid #5a4a3a}#peRoot input[type=range]{width:100%}
#peRoot .rw{display:flex;gap:8px;align-items:center}#peRoot .rw>*{flex:1}#peRoot .rw span{flex:none;min-width:46px;text-align:right;color:#ffd27a;font-weight:800}
#peRoot .seg{display:flex}#peRoot .seg button{flex:1;border-radius:0;padding:8px 6px;font-size:16px}#peRoot .seg button.on{background:linear-gradient(180deg,#a8452c,#5a1a10);color:#fff;border-color:#ffb070}
#peRoot .fxt{padding:10px 12px;background:rgba(120,200,120,.08);border:1px solid rgba(120,200,120,.3);font-size:16px;color:#cfe8c8;margin-top:6px}
#peRoot .msg{padding:8px 24px;font-size:17px;background:rgba(0,0,0,.45);border-top:1px solid rgba(231,194,122,.3);min-height:42px}`; document.head.appendChild(s); }
  const modOk = () => window.Mods && Mods.on('part_editor');
  // ---------- 3D 预览 ----------
  function initGL(cv) {
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false }); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.setClearColor(0x120d10);
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, 0.01, 20); sc.add(new THREE.HemisphereLight(0xfff0e0, 0x302028, 1.1)); const dl = new THREE.DirectionalLight(0xffe2c0, 1.6); dl.position.set(1, 2, 1.5); sc.add(dl); const dl2 = new THREE.DirectionalLight(0x88a0ff, 0.5); dl2.position.set(-2, 1, -1); sc.add(dl2);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.4, 40), new THREE.MeshStandardMaterial({ color: 0x2a2024, roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; sc.add(floor);
    const grid = new THREE.GridHelper(0.8, 16, 0x6a5a40, 0x3a3028); grid.position.y = 0.001; sc.add(grid);
    R = { r, sc, cam, yaw: 0.6, pit: 0.25, dist: 0.85, model: null, drag: false, auto: true };
    cv.addEventListener('pointerdown', e => { R.drag = true; R.auto = false; R.lx = e.clientX; R.ly = e.clientY; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!R.drag) return; R.yaw -= (e.clientX - R.lx) * 0.01; R.pit = Math.max(-0.2, Math.min(1.4, R.pit + (e.clientY - R.ly) * 0.01)); R.lx = e.clientX; R.ly = e.clientY; });
    cv.addEventListener('pointerup', () => R.drag = false); cv.addEventListener('wheel', e => { e.preventDefault(); R.dist = Math.max(0.3, Math.min(2.5, R.dist * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
    const loop = () => { raf = requestAnimationFrame(loop); if (!R) return; const w = cv.clientWidth, h = cv.clientHeight; if (w && (cv.width !== w || cv.height !== h)) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); } if (R.auto) R.yaw += 0.006; const t = new THREE.Vector3(0, 0.17, 0); cam.position.set(t.x + Math.sin(R.yaw) * Math.cos(R.pit) * R.dist, t.y + Math.sin(R.pit) * R.dist, t.z + Math.cos(R.yaw) * Math.cos(R.pit) * R.dist); cam.lookAt(t); r.render(sc, cam); };
    loop();
  }
  function showModel() {
    if (!R) return; if (R.model) { R.sc.remove(R.model); R.model = null; } const k = D && keyFor(D); const PSt = PS(); if (!k) return;
    if (D.raw) PSt.setPreview(k, PSt.finalize(D.raw, D)); else PSt.setPreview(null);
    try { R.model = O().model({ t: k, rar: 2, q: 0.7, own: '预览', race: '', tr: [] }); R.sc.add(R.model); } catch (e) { console.warn(e); } PSt.setPreview(null);
  }
  const keyFor = d => d.replaces || (d.id ? 'cp_' + d.id : null);
  // ---------- 草稿 ----------
  const blank = () => ({ id: 'p' + Date.now().toString(36), name: '', cat: 'limb', replaces: '', icon: '', fx: { st: { str: 1 }, au: 0, pk: 0, tk: null }, jar: true, tf: { rot: [0, 0, 0], scale: 1, off: [0, 0, 0] }, beast: true, dropP: 0.7, note: '', files: null, raw: null, rep: [], stats: null, imgs: [], isNew: true });
  async function pick(sel) { // sel: {k:内置键} 或 {id:自制}
    if (busy) return; cur = sel; const PSt = PS(); let d;
    if (sel.id && PSt.recs.has(sel.id)) { const r = PSt.recs.get(sel.id); d = Object.assign(blank(), JSON.parse(JSON.stringify(Object.assign({}, r, { files: null }))), { files: r.files || null, isNew: false, src: r.src }); d.tf = Object.assign({ rot: [0, 0, 0], scale: 1, off: [0, 0, 0] }, d.tf); }
    else { d = blank(); d.replaces = sel.k; d.cat = O().OG[sel.k].cat === 'limb' ? 'limb' : 'organ'; d.name = ''; const ex = [...PSt.recs.values()].find(r => r.replaces === sel.k); if (ex) return pick({ id: ex.id }); }
    D = d; if (d.files && !d.raw) { try { await ingest(d.files, true); } catch (e) { msg('读取已存模型失败：' + e.message, 1); } } draw(); showModel();
  }
  async function ingest(files, quiet) {
    busy = true; msg('正在解析并检查……'); try { const L = await PS().load(files); D.files = files; D.raw = L.group; D.rep = L.rep; D.stats = L.stats; D.imgs = L.imgs; D.fmt = L.stats.fmt; if (!quiet && !D.name) D.name = files[0].name.replace(/\.[^.]+$/, ''); msg('检查完成：' + (L.rep.some(r => r[0] === 'err') ? '有错误，需处理后才能保存' : '可以保存')); }
    catch (e) { D.rep = [['err', '导入失败', e.message]]; D.raw = null; D.files = null; D.stats = null; D.imgs = []; msg(e.message, 1); } busy = false;
  }
  async function onFiles(list) { if (!D) { D = blank(); cur = { id: D.id }; } const fs = []; for (const f of list) fs.push({ name: f.name, buf: await f.arrayBuffer() }); if (!fs.length) return; await ingest(fs); draw(); showModel(); }
  function msg(t, bad) { const m = root && root.querySelector('#peMsg'); if (m) { m.textContent = t; m.style.color = bad ? '#ff9a8a' : '#cfe8c8'; } }
  // ---------- 界面 ----------
  const fxText = fx => { const a = []; if (fx.st) for (const [k, v] of Object.entries(fx.st)) if (v) a.push(`${SN[k] || k} +${v}`); if (fx.au) a.push(`光环 ×${(1 + fx.au).toFixed(2)}`); if (fx.pk) a.push(`戳击 ×${(1 + fx.pk).toFixed(2)}`); if (fx.tk && fx.tk.n) a.push(`每 ${fx.tk.every}s 产出 ${TK[fx.tk.kind] || fx.tk.kind}×${fx.tk.n}`); return a.join(' · ') || '（没有任何用途——请至少设一项）'; };
  function listHtml() {
    const OG = O().OG, PSt = PS(), own = [...PSt.recs.values()], mk = (k, d) => { const rp = own.find(r => r.replaces === k); return `<div class="it ${cur && cur.k === k ? 'on' : ''}" data-k="${k}"><span class="ic">${d.icon}</span><div><div class="nm">${esc(d.n)}</div><div class="tg">${rp ? '<b>已替换模型</b>' : d.hid ? '旧存档（头部·已不可解剖）' : '内置'}${d.hid ? '' : ''}</div></div></div>`; };
    const by = c => Object.keys(OG).filter(k => !OG[k].custom && (OG[k].cat || 'organ') === c).map(k => mk(k, OG[k])).join('');
    return `<h3>💪 肢体<small>点击 → 导入替换模型</small></h3>${by('limb')}<h3>🫀 内脏</h3>${by('organ')}<h3>🛠 自制部位<small>${own.filter(r => !r.replaces).length}</small></h3>${own.filter(r => !r.replaces).map(r => `<div class="it ${cur && cur.id === r.id ? 'on' : ''}" data-id="${r.id}"><span class="ic">${esc(r.icon || (r.cat === 'organ' ? '🫀' : '🦴'))}</span><div><div class="nm">${esc(r.name)}</div><div class="tg">${r.cat === 'organ' ? '内脏' : '肢体'} · ${r.src === 'file' ? '已在游戏目录' : '仅浏览器'}</div></div><span class="x" data-del="${r.id}" title="删除">🗑</span></div>`).join('') || '<div class="tg" style="padding:6px">还没有。点下面按钮新建。</div>'}<button class="pri" id="peNew" style="width:100%;margin-top:10px">＋ 新建自制部位</button>`;
  }
  function midHtml() {
    if (!D) return '';
    const s = D.stats, rp = D.rep.map(([l, t, d]) => `<div class="rp ${l}"><i>${{ ok: '✅', warn: '⚠️', err: '⛔', info: 'ℹ️' }[l]}</i><div><b>${esc(t)}</b><span>${esc(d)}</span></div></div>`).join('');
    return `<div class="dz" id="peDz">📥 把模型文件拖到这里，或 <button class="sm" id="peBrowse">选择文件</button><small>支持 .glb  .gltf(+.bin)  .obj(+.mtl)  .stl，贴图一起选（png/jpg/webp）。可多选。</small></div><input type="file" id="peFile" multiple hidden accept=".glb,.gltf,.bin,.obj,.mtl,.stl,.png,.jpg,.jpeg,.webp,.gif,.bmp">
${s ? `<div class="st"><div><b>${s.tris.toLocaleString()}</b><span>三角面</span></div><div><b>${s.mats}</b><span>材质</span></div><div><b>${s.texs}</b><span>贴图</span></div><div><b>${(s.bytes / 1024 > 1024 ? (s.bytes / 1048576).toFixed(1) + 'M' : Math.round(s.bytes / 1024) + 'K')}</b><span>体积</span></div></div>` : ''}
${D.imgs && D.imgs.length ? `<div class="th">${D.imgs.map(i => `<figure><img src="${i.url}"><br>${esc(i.name)}<br>${i.bad ? '⛔损坏' : i.w + '×' + i.h}${i.used ? '' : ' · 未用'}</figure>`).join('')}</div>` : ''}${rp}`;
  }
  function rightHtml() {
    if (!D) return '<h3>操作说明</h3><div class="fxt">① 左边选内置部位（替换它的模型），或新建自制部位<br>② 导入模型文件，看检查报告<br>③ 调旋转 / 大小，设名字和用途<br>④ 「保存」→ 立即生效；「保存到游戏目录」→ 写进游戏文件夹，下次双击也在</div>';
    const rep = !!D.replaces, st = D.fx.st || {}, ks = Object.keys(st), s1 = ks[0] || '', s2 = ks[1] || '', tk = D.fx.tk || { kind: 'dust', every: 50, n: 0 }, tf = D.tf;
    const num = (id, v, a, b, st2) => `<div class="rw"><input type="range" id="${id}" min="${a}" max="${b}" step="${st2}" value="${v}"><span id="${id}_v">${v}</span></div>`;
    const sel = (id, v) => `<select id="${id}"><option value="">—</option>${Object.keys(SN).map(k => `<option value="${k}" ${v === k ? 'selected' : ''}>${SN[k]}</option>`).join('')}</select>`;
    return `<h3>${rep ? '替换内置：' + esc(O().OG[D.replaces].n) : '🛠 自制部位'}</h3>
<label>名称</label><input type="text" id="pName" maxlength="12" value="${esc(D.name)}" placeholder="例：猎人的右臂">
${rep ? '' : `<label>类别</label><div class="seg" id="pCat"><button data-v="limb" class="${D.cat === 'limb' ? 'on' : ''}">💪 肢体</button><button data-v="organ" class="${D.cat === 'organ' ? 'on' : ''}">🫀 内脏</button></div>
<label>图标<small>一个 emoji</small></label><input type="text" id="pIcon" maxlength="2" value="${esc(D.icon)}" placeholder="🦴">
<label>用途<small>摆进洞里的标本罐后生效</small></label>
<div class="rw">${sel('pS1', s1)}<input type="number" id="pV1" min="0" max="6" step="1" value="${st[s1] || 0}"></div><div class="rw" style="margin-top:6px">${sel('pS2', s2)}<input type="number" id="pV2" min="0" max="6" step="1" value="${st[s2] || 0}"></div>
<label>光环加成<small>附近首级产出</small></label>${num('pAu', D.fx.au || 0, 0, 0.2, 0.01)}<label>戳击加成</label>${num('pPk', D.fx.pk || 0, 0, 0.3, 0.01)}
<label>定时产出<small>每隔几秒</small></label><div class="rw"><select id="pTk">${Object.keys(TK).map(k => `<option value="${k}" ${tk.kind === k ? 'selected' : ''}>${TK[k]}</option>`).join('')}</select><input type="number" id="pTn" min="0" max="5" value="${tk.n || 0}"><input type="number" id="pTe" min="20" max="200" step="5" value="${tk.every || 50}"></div>
<div class="fxt" id="pFx">${fxText(D.fx)}</div>
<label>战场可解剖到<small>勾选后野兽/人尸也可能出现</small></label><div class="seg" id="pBeast"><button data-v="1" class="${D.beast ? 'on' : ''}">是</button><button data-v="0" class="${D.beast ? '' : 'on'}">仅人类尸体</button></div>`}
<label>显示方式</label><div class="seg" id="pJar"><button data-v="1" class="${D.jar !== false ? 'on' : ''}">🫙 放进标本罐</button><button data-v="0" class="${D.jar === false ? 'on' : ''}">直接展示</button></div>
<label>旋转<small>X / Y / Z（度）</small></label>${['X', 'Y', 'Z'].map((a, i) => num('pR' + i, tf.rot[i], -180, 180, 5).replace('<span', `<span title="${a}"`)).join('')}<div class="rw" style="margin-top:4px"><button class="sm" id="pRst">重置</button><button class="sm" id="pR90">绕 X 转 90°</button></div>
<label>大小<small>1.0 = 自动适配</small></label>${num('pSc', tf.scale, 0.3, 2.5, 0.05)}<label>偏移<small>X / Y / Z</small></label>${['X', 'Y', 'Z'].map((a, i) => num('pO' + i, tf.off[i], -3, 3, 0.1)).join('')}
<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="pri" id="peSave" style="flex:1">💾 保存</button><button id="peDir" style="flex:1">📁 保存到游戏目录</button></div>
${rep && PS().recs.has(D.id) ? '<button id="peRevert" style="width:100%;margin-top:10px">↩ 还原为内置模型</button>' : ''}`;
  }
  function draw() {
    if (!root) return; root.querySelector('.L').innerHTML = listHtml(); root.querySelector('.Mb').innerHTML = midHtml(); root.querySelector('.Rr').innerHTML = rightHtml();
    root.querySelector('#peOv').textContent = D ? (D.name || '（未命名）') + ' · 拖动旋转 · 滚轮缩放' : '← 选一个部位，或新建'; bind();
  }
  function readForm() {
    const g = id => root.querySelector('#' + id); if (!g('pName')) return; D.name = g('pName').value.trim(); const n = id => +g(id).value;
    if (!D.replaces) { const st = {}; for (const [s, v] of [['pS1', 'pV1'], ['pS2', 'pV2']]) if (g(s).value && n(v) > 0) st[g(s).value] = n(v); D.fx = { st, au: n('pAu'), pk: n('pPk'), tk: n('pTn') > 0 ? { kind: g('pTk').value, n: n('pTn'), every: n('pTe') } : null }; D.icon = g('pIcon').value.trim(); g('pFx').textContent = fxText(D.fx); }
    D.tf = { rot: [n('pR0'), n('pR1'), n('pR2')], scale: n('pSc'), off: [n('pO0'), n('pO1'), n('pO2')] };
    root.querySelectorAll('input[type=range]').forEach(r => { const v = root.querySelector('#' + r.id + '_v'); if (v) v.textContent = r.value; });
  }
  function bind() {
    const q = s => root.querySelector(s), L = q('.L'), M = q('.Mb'), Rr = q('.Rr');
    L.onclick = e => { const del = e.target.closest('[data-del]'); if (del) { e.stopPropagation(); delPart(del.dataset.del); return; } const it = e.target.closest('.it'); if (it) pick(it.dataset.id ? { id: it.dataset.id } : { k: it.dataset.k }); if (e.target.id === 'peNew') { D = blank(); cur = { id: D.id }; draw(); showModel(); } };
    const dz = q('#peDz'), fi = q('#peFile'); if (dz) { q('#peBrowse').onclick = () => fi.click(); fi.onchange = () => { onFiles(fi.files); fi.value = ''; }; dz.ondragover = e => { e.preventDefault(); dz.classList.add('hv'); }; dz.ondragleave = () => dz.classList.remove('hv'); dz.ondrop = e => { e.preventDefault(); dz.classList.remove('hv'); onFiles(e.dataTransfer.files); }; }
    const MM = q('.M'); MM.ondragover = e => e.preventDefault(); MM.ondrop = e => { e.preventDefault(); onFiles(e.dataTransfer.files); };
    const refresh = (full) => { readForm(); if (full) showModel(); else if (D.raw) showModel(); };
    Rr.oninput = e => { if (e.target.closest('#pName')) { readForm(); return; } refresh(e.target.type === 'range'); };
    Rr.onchange = e => { readForm(); if (e.target.tagName === 'SELECT') showModel(); };
    Rr.onclick = e => { const b = e.target.closest('.seg button'); if (b) { const sg = b.parentNode.id; b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); if (sg === 'pCat') D.cat = b.dataset.v; if (sg === 'pBeast') D.beast = b.dataset.v === '1'; if (sg === 'pJar') D.jar = b.dataset.v === '1'; readForm(); showModel(); return; }
      if (e.target.id === 'pRst') { D.tf = { rot: [0, 0, 0], scale: 1, off: [0, 0, 0] }; const k = D; draw(); showModel(); } else if (e.target.id === 'pR90') { D.tf.rot[0] = ((D.tf.rot[0] + 90 + 180) % 360) - 180; draw(); showModel(); } else if (e.target.id === 'peSave') save(false); else if (e.target.id === 'peDir') save(true); else if (e.target.id === 'peRevert') delPart(D.id); };
  }
  async function delPart(id) { const PSt = PS(), r = PSt.recs.get(id); if (!r || !confirm('删除「' + (r.name || r.replaces) + '」？（游戏目录里已写出的文件需要自己删）')) return; PSt.unregister(r); PSt.recs.delete(id); try { await PSt.dbDel(id); } catch (e) { } if (cur && (cur.id === id || cur.k === r.replaces)) { D = null; cur = null; } draw(); showModel(); msg('已删除'); }
  // ---------- 保存 ----------
  function validate() { if (!D.name) return '先给它起个名字'; if (!D.replaces && !(D.fx.st && Object.keys(D.fx.st).length) && !D.fx.au && !D.fx.pk && !D.fx.tk) return '至少给它设一项用途（属性 / 光环 / 戳击 / 产出）'; if (!D.files) return '还没有导入模型文件'; if (D.rep.some(r => r[0] === 'err')) return '检查报告里还有错误（⛔），处理后才能保存'; return ''; }
  function toRec() { return { id: D.id, name: D.name, cat: D.cat, replaces: D.replaces || '', icon: D.icon, fx: D.fx, jar: D.jar !== false, tf: D.tf, beast: !!D.beast, dropP: D.dropP, note: D.note, fmt: D.fmt, files: D.files, t: Date.now() }; }
  async function save(toDir) {
    readForm(); const bad = validate(); if (bad) { msg('⛔ ' + bad, 1); return; } const PSt = PS(), old = PSt.recs.get(D.id), r = toRec(); if (old) PSt.unregister(old);
    try { await PSt.dbPut(r); } catch (e) { msg('浏览器存储失败：' + e.message, 1); return; } const rec = Object.assign({ src: 'db' }, r); PSt.recs.set(r.id, rec); PSt.register(rec); await PSt.buildOne(rec); D.isNew = false; cur = r.replaces ? { id: r.id } : { id: r.id }; D.src = 'db';
    if (O().OG[PSt.keyOf(r)] === undefined) msg('已保存但没有注册成功', 1); else msg('✅ 已保存并生效。' + (r.replaces ? '' : '它现在会出现在战场解剖里（若勾了“野兽”也可能从兽尸取到）。')); draw(); showModel();
    if (toDir) await saveDir();
  }
  const ser = m => ({ id: m.id, name: m.name, cat: m.cat, replaces: m.replaces, icon: m.icon, fx: m.fx, jar: m.jar, tf: m.tf, beast: m.beast, dropP: m.dropP, note: m.note, fmt: m.fmt, n: (m.files || []).length });
  async function saveDir() {
    const PSt = PS(); const all = [...PSt.recs.values()]; for (const m of all) if (!m.files) { try { m.files = await PSt.loadStatic(m); } catch (e) { msg('读不到 ' + m.id + ' 的数据：' + e.message, 1); return; } }
    const manifest = '// 由残肢器官编辑器生成（MOD part_editor）。请随游戏一起提交。\nwindow.CUSTOM_PARTS = ' + JSON.stringify(all.map(m => Object.assign(ser(m), { src: 'file' })), null, 1) + ';\n', data = m => 'window.CUSTOM_PART_DATA = window.CUSTOM_PART_DATA || {};\nCUSTOM_PART_DATA[' + JSON.stringify(m.id) + '] = ' + JSON.stringify(m.files.map(f => ({ name: f.name, b64: PSt.b64(f.buf) }))) + ';\n';
    if (!window.showDirectoryPicker) { dl('manifest.js', manifest); for (const m of all) dl(m.id + '.js', data(m)); msg('⚠ 这个浏览器不能直接写目录（需 Chrome / Edge）。已下载 manifest.js 和每个部位的 .js，请手动放进游戏目录的 assets/custom_parts/ 文件夹。', 1); return; }
    let dir; try { dir = await showDirectoryPicker({ mode: 'readwrite' }); } catch (e) { msg('已取消选择目录'); return; }
    try { await dir.getFileHandle('index.html'); } catch (e) { msg('⛔ 这个文件夹里没有 index.html —— 请选游戏的根目录（含 index.html 的那个）。', 1); return; }
    try { const a = await dir.getDirectoryHandle('assets', { create: true }), c = await a.getDirectoryHandle('custom_parts', { create: true }), sd = await c.getDirectoryHandle('src', { create: true });
      const wr = async (h, name, body) => { const f = await h.getFileHandle(name, { create: true }), w = await f.createWritable(); await w.write(body); await w.close(); };
      await wr(c, 'manifest.js', manifest); for (const m of all) { await wr(c, m.id + '.js', data(m)); const d2 = await sd.getDirectoryHandle(m.id, { create: true }); for (const f of m.files) await wr(d2, f.name.split(/[\\/]/).pop(), f.buf); m.src = 'file'; }
      msg('✅ 已写入游戏目录：assets/custom_parts/（manifest.js + ' + all.length + ' 个部位 + 源文件）。刷新游戏后双击即用；记得把它提交到仓库。'); draw();
    } catch (e) { msg('写入失败：' + e.message, 1); }
  }
  function dl(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  // ---------- 开关 ----------
  async function open() {
    if (root) return; if (!modOk()) { alert('先在 MOD 面板里开启并应用「残肢器官编辑器」。'); return; }
    if (!window.Organs || !window.PartStore || !window.THREE) { alert('游戏还没加载完。'); return; }
    try { document.exitPointerLock && document.exitPointerLock(); } catch (e) { } addCss(); if (!PS().ready) await PS().reinit();
    root = document.createElement('div'); root.id = 'peRoot'; root.innerHTML = `<div class="tp"><h1>🦴 残肢器官编辑器</h1><span class="sub">导入模型 · 检查贴图 · 命名 · 设定用途</span><span class="sp"></span><button id="peClose">✕ 关闭</button></div><div class="mn"><div class="col L"></div><div class="col M"><div class="vw"><canvas class="pv"></canvas><div class="ov" id="peOv"></div></div><div class="Mb"></div></div><div class="col Rr"></div></div><div class="msg" id="peMsg">选一个部位开始。</div>`; document.body.appendChild(root);
    root.querySelector('#peClose').onclick = close; keyH = e => { if (!root) return; if (e.code === 'Escape' && e.type === 'keydown') close(); e.stopPropagation(); }; addEventListener('keydown', keyH, true); addEventListener('keyup', keyH, true);
    initGL(root.querySelector('canvas.pv')); D = null; cur = null; draw();
  }
  function close() { if (!root) return; removeEventListener('keydown', keyH, true); removeEventListener('keyup', keyH, true); cancelAnimationFrame(raf); if (R) { R.r.forceContextLoss(); R.r.dispose(); R = null; } PS().setPreview(null); root.remove(); root = null; D = null; }
  return { open, close, get isOpen() { return !!root; } };
})();
