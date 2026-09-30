// 神灵（先祖）系统 —— 第二十八轮。
// 洞里不再只有斯尼克：头颅会唤醒历代洞主的魂（缩成小精灵）。她们会说话、会评价你的头、有好感度/心愿/个人故事，
// 九处故乡各有一盏魂灯，九灯皆亮 + 与先祖们处熟 → 解咒仪式。数据见 spirit_data.js / spirit_s1.js / spirit_s2.js，立绘见 spirit_art.js。
// MOD：spirits（默认开）。玩家可随时在神灵簿（Y）里“隐身”所有神灵。存档：G.S.spirit（随 G.save 一起存）。
window.Spirits = (() => {
  const D = window.SPIRIT_DATA, SC = window.SPIRIT_SCRIPTS, ART = window.SPIRIT_ART || {};
  if (!D || !SC) return {};
  const modOn = () => !window.Mods || Mods.on('spirits');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const RC = ['#b8b8c0', '#4aa8ff', '#c05aff', '#ffb020', '#ff4a8a'], RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
  const LANDN = { village: '雾溪村', forest: '翠影精灵林', wilds: '兽牙荒原', abbey: '白银修道院', swamp: '黑沼魔女泽', fortress: '铁盔要塞', capital: '金冠王都', abyss: '深渊裂隙', peak: '龙骨圣山' };
  const LANDI = { village: '🏘️', forest: '🌲', wilds: '🐺', abbey: '⛪', swamp: '🐸', fortress: '🏰', capital: '👑', abyss: '🕳️', peak: '🐉' };
  const NMF = c => (window.NM ? NM(c) : (c && c.name) || '？');
  const artRaw = sp => ART[sp.art] || ART[sp.artFallback] || '';
  const KEYED = {};  // 黑底立绘 → 抠成透明 PNG（DOM 里 mix-blend 会被父级层叠上下文吃掉，直接预处理成 alpha）
  const artOf = sp => KEYED[sp.id] || artRaw(sp);
  function keyArt() { for (const sp of D.ROSTER) { const u = artRaw(sp); if (!u || KEYED[sp.id]) continue; const im = new Image(); im.onload = () => { try { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), a = d.data; for (let i = 0; i < a.length; i += 4) { const m = Math.max(a[i], a[i + 1], a[i + 2]), al = Math.min(255, m * 1.25); if (al < 6) { a[i + 3] = 0; continue; } const k = 255 / Math.max(m, 1); a[i] = Math.min(255, a[i] * k); a[i + 1] = Math.min(255, a[i + 1] * k); a[i + 2] = Math.min(255, a[i + 2] * k); a[i + 3] = al; } g.putImageData(d, 0, 0); KEYED[sp.id] = c.toDataURL('image/png'); } catch (e) {} }; im.src = u; } }
  const G0 = () => window.G;

  // ---------------- 存档 ----------------
  function st() { const S = G0().S; if (!S.spirit) S.spirit = { v: 1, hide: false, ch: 0, met: {}, loc: {}, lit: {}, flags: {}, end: null, q: [], chatN: 0 }; const T = S.spirit; T.met = T.met || {}; if (!T.mig2) { T.mig2 = 1; const MP = { xijin: 'xiaozhu', wuchuan: 'awu', qingmian: 'yeye', lieya: 'liaoya', bailing: 'shengling', heirui: 'paopao', daishan: 'tiechui', yaoguan: 'jinguan', yuanmu: 'wuyan', baihai: 'laogu' }; for (const k in MP) if (T.met[k]) { T.met[MP[k]] = T.met[k]; delete T.met[k]; } T.flags = T.flags || {}; if (T.flags.prolog) T.flags.sight = 1; T.q = []; } T.loc = T.loc || {}; T.lit = T.lit || {}; T.flags = T.flags || {}; T.q = T.q || []; return T; }
  const lv = a => { let l = 0; D.LV_AT.forEach((v, i) => { if (a >= v) l = i; }); return l; };
  const met = id => st().met[id];
  const litN = () => Object.keys(st().lit).length;
  const friends = () => Object.keys(st().met).filter(k => k !== 'chudai' && st().met[k].aff >= 45).length;
  const inCave = () => { const g = G0(); return g && g.playing && !(window.Explore && Explore.active) && !(window.Worlds && Worlds.active); };
  const busy = () => { const g = G0(); return !g || g.uiOpen || g.cine || (window.Explore && Explore.active) || (window.Worlds && Worlds.active) || !g.playing || dlg.open || pan.open; };
  const headsHere = () => G0().S.heads.filter(r => !r.inBag && !r.vault);
  const fmt = (t, cx) => String(t).replace(/\{(\w+)\}/g, (m, k) => ({ heads: headsHere().length, coins: Math.floor(G0().S.coins), depth: G0().S.depth, lit: litN(), head: (cx && cx.head) || '那颗头', land: (cx && cx.land) || '' }[k] ?? m));

  // ---------------- 好感 / 心愿 ----------------
  function addAff(id, n, quiet) { const m = met(id); if (!m || !n) return; const o = lv(m.aff); m.aff = Math.max(0, Math.min(100, m.aff + n)); const l = lv(m.aff);
    if (!quiet && n > 0) dlgFloat('+' + n + ' ❤'); if (l > o) { G0().toast(`💛 与 <b>${D.BY[id].n}</b> 的关系：<b>${D.LV[l]}</b>`, '#ffd890', 3); SFX.confirm && SFX.confirm(); labelDirty = 1; } }
  function addMet(id, silent) { const T = st(); if (T.met[id]) return T.met[id]; T.met[id] = { aff: 0, tk: {}, sto: 0, need: null, nextNeed: 0, seen: [], intro: 0, heart: 0, t: Date.now() }; spawnSprite(id); labelDirty = 1; if (!silent) { G0().toast(`✨ 神灵 <b>${D.BY[id].n}</b> 来到了洞里`, D.BY[id].col, 3.5); SFX.levelup && SFX.levelup(); } return T.met[id]; }
  function makeNeed(id) { const m = met(id), sp = D.BY[id], S = G0().S, hs = headsHere(), r = Math.random();
    if (hs.length && r < 0.6) { const h = pick(hs).c, k = pick(['race', 'trait', 'land']);
      if (k === 'race') return { k: 'race', v: h.race, lab: D.NEEDS.headOfRace.t(h.raceN), d: D.NEEDS.headOfRace.d(h.raceN) };
      if (k === 'trait' && h.traits && h.traits.length) { const t = pick(h.traits); return { k: 'trait', v: t, lab: D.NEEDS.headOfTrait.t(t), d: D.NEEDS.headOfTrait.d(t) }; }
      if (h.loc) return { k: 'land', v: h.loc, lab: D.NEEDS.headOfLand.t(LANDN[h.loc] || h.locN), d: D.NEEDS.headOfLand.d(LANDN[h.loc] || h.locN) };
    }
    if (r < 0.85) { const n = Math.round((40 + S.depth * 35 + m.aff * 2.5) / 10) * 10; return { k: 'coins', v: n, lab: D.NEEDS.coins.t(n), d: D.NEEDS.coins.d(n) }; }
    return { k: 'talk', v: 2, n: 0, lab: D.NEEDS.talk.t(), d: D.NEEDS.talk.d() }; }
  function ensureNeed(id) { const m = met(id); if (!m || m.need || Date.now() < m.nextNeed) return; m.need = makeNeed(id); }
  function needMatch(nd, c) { return nd.k === 'race' ? c.race === nd.v : nd.k === 'trait' ? (c.traits || []).includes(nd.v) : nd.k === 'land' ? c.loc === nd.v : false; }
  function needDone(id, why) { const m = met(id); if (!m || !m.need) return; const S = G0().S, rw = Math.round(40 + S.depth * 30 + m.aff); m.need = null; m.nextNeed = Date.now() + 150000; S.coins += rw; addAff(id, 6);
    const extra = Math.random() < 0.25 ? (S.items.potion = (S.items.potion || 0) + 1, ' · 🧪 +1 药水') : ''; G0().toast(`🎁 <b>${D.BY[id].n}</b> 的心愿达成！🔮 +${rw}${extra}`, '#ffd27a', 3); G0().save && G0().save(); }

  // ---------------- 评头 ----------------
  const voiceOf = t => { for (const k in D.VOICE) if (D.VOICE[k].includes(t)) return k; return 'cold'; };
  function taste(sp, c) { let s = 0; const L = sp.likes || {}, H = sp.hates || {}, tr = c.traits || [];
    if (L.race && L.race.includes(c.race)) s += 2; if (H.race && H.race.includes(c.race)) s -= 2;
    s += Math.min(3, tr.filter(t => (L.trait || []).includes(t)).length); s -= Math.min(4, 2 * tr.filter(t => (H.trait || []).includes(t)).length);
    if (L.rar && c.rar >= L.rar[0] && c.rar <= L.rar[1]) s += 2; if (H.rar && c.rar >= H.rar[0] && c.rar <= H.rar[1]) s -= 2;
    if (c.shiny) s += 1; if (sp.land && c.loc === sp.land) s += 1; return s; }
  function verdictOf(s) { return s >= 4 ? 'love' : s >= 2 ? 'like' : s <= -1 ? 'hate' : 'meh'; }
  function appraise(id, rec) { const sp = D.BY[id], c = rec.c, P = D.POOL[sp.arche] || D.POOL.elder, m = met(id), s = taste(sp, c), vd = verdictOf(s), stale = m.seen.includes(rec.id);
    const tr = (c.traits || [])[0], rk = window.Ranks && Ranks.short ? Ranks.short(c) : '';
    const L = [`（${sp.n}凑近了${NMF(c)}。）`, pick(P.rar[Math.min(4, c.rar)])];
    L.push(`她是${LANDN[c.loc] || c.locN}的${c.raceN}${c.idN}${tr ? `，性格${c.traits.join('、')}` : ''}${rk ? `，阶位「${rk}」` : ''}。` + (Math.random() < 0.5 ? D.RACE_NOTE[c.race] || '' : (tr ? D.TRAIT_NOTE[voiceOf(tr)] || '' : '')));
    if (c.shiny) L.push(pick(P.shiny)); if (sp.land && c.loc === sp.land) L.push(pick(P.home));
    L.push(pick(P.verdict[vd])); if (stale) L.push(pick(P.stale));
    let gain = stale ? 0 : { love: 3, like: 2, meh: 1, hate: 0 }[vd]; if (!stale) { m.seen.push(rec.id); if (m.seen.length > 80) m.seen.shift(); }
    return { lines: L, gain, vd, score: s, stale }; }

  // ---------------- 3D：精灵 / 名牌 / 光晕 ----------------
  let root = null, sprites = {}, labelDirty = 1, texCache = {}, glowTex = null, sight = false, sightT = 1;
  const THREEok = () => window.THREE && G0() && G0().scene;
  function getGlowTex() { if (glowTex) return glowTex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.5, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return glowTex = new THREE.CanvasTexture(c); }
  function artTex(sp) { const u = artRaw(sp); if (!u) return null; if (texCache[u]) return texCache[u]; const t = new THREE.TextureLoader().load(u); t.encoding = THREE.sRGBEncoding; return texCache[u] = t; }
  function nameTex(sp, m) { const c = document.createElement('canvas'); c.width = 320; c.height = 80; const g = c.getContext('2d'); g.font = 'bold 34px "Microsoft YaHei",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const l = lv(m.aff), hearts = '♥'.repeat(l) + '♡'.repeat(4 - l); g.shadowColor = '#000'; g.shadowBlur = 8; g.fillStyle = sp.col; g.fillText(sp.n, 160, 28); g.font = '22px sans-serif'; g.fillStyle = '#ffb0c0'; g.fillText(hearts + ' ' + D.LV[l], 160, 62);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
  function spawnSprite(id) { if (sprites[id] || !THREEok()) return; const sp = D.BY[id], g = G0(), m = met(id); if (!root) { root = new THREE.Group(); root.name = 'spirits'; g.scene.add(root); }
    const tex = artTex(sp); if (!tex) return; const grp = new THREE.Group();
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: sp.artFallback && !ART[sp.art] ? 0xff9a7a : 0xffffff }); const spr = new THREE.Sprite(mat); spr.scale.setScalar(1.25); grp.add(spr);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: getGlowTex(), color: sp.col, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); glow.scale.setScalar(2.4); glow.position.y = 0.05; grp.add(glow);
    const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex(sp, m), transparent: true, depthTest: false, fog: false })); lab.scale.set(0.9, 0.225, 1); lab.position.y = -0.82; lab.renderOrder = 20; grp.add(lab);
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex('!'), transparent: true, depthTest: false, fog: false })); mark.scale.setScalar(0.2); mark.position.y = 0.88; mark.renderOrder = 21; mark.visible = false; grp.add(mark);
    root.add(grp); sprites[id] = { grp, spr, glow, lab, mark, ph: Math.random() * 6.28, home: new THREE.Vector3(), cur: null, appear: 0 }; }
  const markCache = {}; function markTex(ch) { if (markCache[ch]) return markCache[ch]; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.font = 'bold 48px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = ch === '♥' ? '#ff6a8a' : '#ffe27a'; g.strokeStyle = '#000'; g.lineWidth = 6; g.strokeText(ch, 32, 34); g.fillText(ch, 32, 34); return markCache[ch] = new THREE.CanvasTexture(c); }
  function layout() { const cave = G0().cave; if (!cave) return; const ids = Object.keys(sprites), R = cave.R || 10, r = Math.min(4.8, R * 0.42);
    const ang = v => Math.atan2(v.x, v.z), avoid = [ang(cave.exitPos), ang(cave.merchantPos)], slots = [];
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.25; if (avoid.some(b => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.42)) continue; slots.push(a); }
    ids.forEach((id, i) => { const a = slots[i % slots.length], rr = r + (i >= slots.length ? 1.6 : (i % 2) * 0.5); sprites[id].home.set(Math.sin(a) * rr, 0, Math.cos(a) * rr); }); }
  function tick3d(dt, now) { const g = G0(); const vis = modOn() && !st().hide && inCave(); sightT += ((seeing() && vis ? 1 : 0) - sightT) * Math.min(1, dt * 3.2); if (root) root.visible = vis && sightT > 0.02; if (!vis || sightT <= 0.02) return;
    const cave = g.cave; if (!cave) return; if (root && cave.group && root.parent !== cave.group) cave.group.add(root); if (!tick3d._l || now - tick3d._l > 1 || labelDirty) { tick3d._l = now; layout(); }
    const cam = g.camera, pp = g.player.pos;
    for (const id in sprites) { const s = sprites[id], m = met(id), sp = D.BY[id]; if (!m) continue;
      s.appear = Math.min(1, s.appear + dt * 0.8); const wob = now * 0.35 + s.ph, hx = s.home.x + Math.sin(wob) * 0.55, hz = s.home.z + Math.cos(wob * 0.8) * 0.55;
      const near = Math.hypot(pp.x - hx, pp.z - hz) < 3.4, y = (cave.floorAt ? cave.floorAt(hx, hz) : 0) + 1.15 + Math.sin(now * (near ? 2.6 : 1.4) + s.ph) * (near ? 0.1 : 0.06);
      s.grp.position.set(hx, y, hz); s.spr.material.opacity = s.appear * sightT; const pulse = 0.22 + 0.1 * Math.sin(now * 2 + s.ph) + (near ? 0.18 : 0); s.glow.material.opacity = pulse * s.appear * sightT;
      s.spr.scale.setScalar(1.25 * (1 + 0.03 * Math.sin(now * 3 + s.ph)) * (0.6 + 0.4 * s.appear));
      const hasTodo = (m.sto < 3 && m.aff >= D.LV_AT[m.sto + 1] && SC[id] && SC[id].story) || !m.intro || (m.aff >= 90 && !m.heart && SC[id] && SC[id].heart);
      s.mark.visible = !!hasTodo && sightT > 0.5; s.mark.position.y = 0.88 + Math.sin(now * 3) * 0.05;
      if (labelDirty) { s.lab.material.map.dispose(); s.lab.material.map = nameTex(sp, m); s.lab.material.needsUpdate = true; } }
    labelDirty = 0; }

  // ---------------- 通神视角（N）：中了咒的洞主，闭眼再睁眼，才看得见洞里的神灵（MOD spirit_sight，默认开；关掉则始终可见） ----------------
  const needSight = () => !window.Mods || Mods.on('spirit_sight');
  const seeing = () => !needSight() || sight;
  let vEl = null, hintT = 0;
  function sightOn(b, quiet) { const T = st(); if (!needSight()) return; if (b && !T.flags.sight) { G0().toast('你还看不见神灵——先把第一颗头带回洞里，让小烛教你「通神视角」。', '#b8a080', 2.6); return; } if (sight === !!b) return; sight = !!b; if (!vEl) { vEl = document.createElement('div'); vEl.id = 'spsight'; document.body.appendChild(vEl); } vEl.classList.toggle('on', sight);
    if (!quiet) G0().toast(sight ? '👁 <b>通神视角</b> 已开启——神灵们显现了（再按 N 关闭）' : '通神视角已关闭', sight ? '#ffd8a8' : '#b8a080', 2.2); try { sight ? (SFX.open && SFX.open()) : (SFX.close && SFX.close()); } catch (e) {} }
  const ensureSight = () => { if (needSight() && !sight) sightOn(true, true); };
  // ---------------- 瞄准 / 交互 ----------------
  let aim = null;
  function updAim() { aim = null; if (!modOn() || st().hide || !inCave() || busy() || !seeing() || sightT < 0.6) return; const g = G0(), cam = g.camera, dir = new THREE.Vector3(); cam.getWorldDirection(dir); let best = 9;
    for (const id in sprites) { const s = sprites[id]; if (s.appear < 0.6) continue; const wp = new THREE.Vector3(); s.grp.getWorldPosition(wp); const v = wp.sub(cam.position), d = v.length(); if (d > 4.8) continue; const a = Math.acos(Math.max(-1, Math.min(1, dir.dot(v) / d))), lim = 0.14 + 0.45 / d; if (a < lim && a < best) { best = a; aim = id; } } }
  function onTip(hit, held) { if (!aim) return null; const sp = D.BY[aim], m = met(aim), hl = G0().held;
    return `<b style="color:${sp.col}">${sp.n}</b> <small>${sp.title} · ${D.LV[lv(m.aff)]}${!m.intro ? ' · ✨初次见面' : ''}</small><br><b>[E]</b> ${hl ? '让她看看手里的头' : '和她说话'} <small>· Y 神灵簿</small>`; }
  function onE(hit, held, pickup) { if (!aim || dlg.open) return false; openDlg(aim, G0().held ? 'held' : ''); return true; }

  // ---------------- 对话框 UI ----------------
  const dlg = { open: false, id: null, cb: null, typing: null, q: [], choices: null, ctx: {}, mode: '' };
  let el = null, bubs = null;
  const CSS = `#spdlg{position:fixed;inset:0;z-index:75;display:none;font-family:"Noto Serif SC","Songti SC","Microsoft YaHei",serif;color:#f3e8d2;user-select:none}
#spdlg.on{display:block}#spdlg .sd-dim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(6,3,10,.72) 100%);animation:sdfade .4s}@keyframes sdfade{from{opacity:0}}
#spdlg .sd-wrap{position:absolute;left:50%;bottom:3vh;transform:translateX(-50%);width:min(1180px,96vw);display:flex;align-items:flex-end;gap:10px;pointer-events:none}
#spdlg .sd-por{flex:0 0 auto;width:min(40vh,380px);height:min(40vh,380px);position:relative;margin-bottom:-2vh;animation:sdpor .5s cubic-bezier(.2,1,.3,1)}@keyframes sdpor{from{opacity:0;transform:translateX(-40px)}}
#spdlg .sd-por img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 22px var(--c));animation:sdfloat 3.4s ease-in-out infinite}@keyframes sdfloat{50%{transform:translateY(-10px)}}
#spdlg .sd-por.talk img{animation:sdtalk .32s ease-in-out infinite}@keyframes sdtalk{50%{transform:translateY(-6px) scale(1.03)}}
#spdlg .sd-por.dim img{opacity:.35;filter:none}
#spdlg .sd-box{flex:1;min-width:0;pointer-events:auto;background:linear-gradient(160deg,#241710f7,#0c0807f7);border:2px solid var(--c);border-radius:14px;box-shadow:0 0 0 1px #000,0 14px 60px #000c,0 0 34px -8px var(--c);padding:12px 20px 12px;position:relative;animation:sdbox .35s}@keyframes sdbox{from{opacity:0;transform:translateY(16px)}}
#spdlg .sd-np{display:flex;align-items:baseline;gap:12px;margin-bottom:6px;flex-wrap:wrap}#spdlg .sd-n{font-size:24px;font-weight:900;color:var(--c);letter-spacing:3px;text-shadow:0 0 12px var(--c)}#spdlg .sd-t{font-size:14px;color:#c8b090}
#spdlg .sd-hr{margin-left:auto;font-size:15px;color:#ff9ab0;letter-spacing:2px}#spdlg .sd-hr small{color:#c8b090;letter-spacing:0;margin-left:6px}
#spdlg .sd-tx{font-size:clamp(18px,1.55vw,22px);line-height:1.75;min-height:5.2em;}#spdlg .sd-tx:empty{display:none}#spdlg .sd-tx.x{white-space:pre-wrap}#spdlg .sd-tx.me{color:#bfe0ff;text-align:right;font-style:italic}#spdlg .sd-tx.nar{color:#b8a890;font-style:italic;text-align:center}
#spdlg .sd-ft{font-size:12px;color:#8d7a6a;text-align:right;margin-top:2px}
#spdlg .sd-ch{display:flex;flex-direction:column;gap:7px;margin:6px 0 4px}#spdlg .sd-ch button{font:inherit;font-size:clamp(16px,1.3vw,19px);text-align:left;padding:9px 16px;border-radius:10px;border:1px solid #6a4a2e;background:#2c1d14;color:#f0e2c8;cursor:pointer;transition:all .15s;animation:sdb .3s backwards}
#spdlg .sd-ch button:nth-child(2){animation-delay:.05s}#spdlg .sd-ch button:nth-child(3){animation-delay:.1s}#spdlg .sd-ch button:nth-child(4){animation-delay:.15s}#spdlg .sd-ch button:nth-child(n+5){animation-delay:.2s}@keyframes sdb{from{opacity:0;transform:translateX(-12px)}}
#spdlg .sd-ch button:hover{background:#4a2e1c;border-color:var(--c);transform:translateX(5px)}#spdlg .sd-ch button b{color:var(--c);margin-right:8px}#spdlg .sd-ch button.todo{border-color:#ffd27a;box-shadow:0 0 14px #ffd27a55;background:#3c2a14}#spdlg .sd-ch button small{color:#a89070;margin-left:8px}#spdlg .sd-ch button.dis{opacity:.45;cursor:default}
#spdlg .sd-fl{position:absolute;right:30px;top:-14px;font:900 26px serif;color:#ff9ab0;text-shadow:0 0 10px #ff6a8a,0 2px 0 #000;animation:sdfl 1.3s ease-out forwards;pointer-events:none}@keyframes sdfl{0%{transform:translateY(10px) scale(.4);opacity:0}20%{transform:none;opacity:1;scale:1.3}100%{transform:translateY(-44px);opacity:0}}
#spdlg .sd-hl{display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:34vh;overflow:auto}#spdlg .sd-hl button{font-size:15px!important;padding:7px 12px!important}
#spbubs{position:fixed;inset:0;pointer-events:none;z-index:64}#spbubs .sb{position:absolute;transform:translate(-50%,-100%);max-width:min(300px,70vw);padding:8px 14px;border-radius:14px 14px 14px 3px;background:#1a110df0;border:1.5px solid var(--c);color:#f5ead4;font:600 17px/1.55 "Noto Serif SC","Microsoft YaHei",serif;box-shadow:0 6px 24px #000a,0 0 18px -6px var(--c);animation:sbin .35s cubic-bezier(.2,1.3,.3,1)}#spbubs .sb b{display:block;color:var(--c);font-size:14px;margin-bottom:1px}@keyframes sbin{from{opacity:0;margin-top:14px;scale:.8}}
#spsight{position:fixed;inset:0;z-index:38;pointer-events:none;opacity:0;transition:opacity .7s;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 42%,rgba(120,70,30,.22) 80%,rgba(40,18,8,.5) 100%),linear-gradient(rgba(255,210,150,.04),rgba(255,160,120,.04))}#spsight.on{opacity:1}
#spchip{position:fixed;right:14px;bottom:70px;z-index:40;padding:7px 14px;border-radius:22px;background:rgba(18,11,8,.82);border:1px solid #8a6a3a;color:#f0dcb8;font:700 14px "Microsoft YaHei",sans-serif;cursor:pointer;display:none;box-shadow:0 4px 16px #0008;user-select:none}#spchip:hover{border-color:#ffd27a;background:rgba(40,24,14,.92)}#spchip small{color:#b8a080;margin-left:6px;font-weight:400}#spchip.todo{animation:spc 1.6s ease-in-out infinite}@keyframes spc{50%{box-shadow:0 0 18px #ffd27a}}
#sppan{position:fixed;inset:0;z-index:76;display:none;background:radial-gradient(ellipse at 50% 30%,#2a1c24f2,#0a0609f8);color:#f0e2c8;font-family:"Noto Serif SC","Microsoft YaHei",serif;overflow:auto;user-select:none}#sppan.on{display:block}
#sppan .sp-in{max-width:1240px;margin:0 auto;padding:22px 26px 40px}#sppan h2{margin:0;font-size:28px;letter-spacing:6px;color:#ffd890;display:flex;align-items:center;gap:16px}#sppan h2 small{font-size:13px;letter-spacing:1px;color:#b09880;font-weight:400}
#sppan .sp-top{display:flex;gap:10px;margin-left:auto}#sppan button{font:inherit;font-size:14px;font-weight:700;padding:8px 16px;border-radius:10px;border:1px solid #6a4a2e;background:#2e1e14;color:#eadcc4;cursor:pointer}#sppan button:hover{background:#4a2e1c;border-color:#d0a060}
#sppan .sp-q{margin:16px 0 10px;padding:14px 18px;border-radius:12px;background:#ffffff0a;border:1px solid #ffd27a44;font-size:16px;line-height:1.8}#sppan .sp-q b{color:#ffd27a}
#sppan .sp-lamps{display:grid;grid-template-columns:repeat(9,1fr);gap:8px;margin:10px 0 18px}#sppan .sp-lp{text-align:center;padding:8px 2px 6px;border-radius:10px;background:#0006;border:1px solid #ffffff18;font-size:12px;color:#8d7a6a}#sppan .sp-lp i{display:block;font-style:normal;font-size:28px;filter:grayscale(1) brightness(.5)}#sppan .sp-lp.on{border-color:#ffd27a;color:#ffe8b8;background:radial-gradient(circle at 50% 30%,#ffd27a33,#0006)}#sppan .sp-lp.on i{filter:none;text-shadow:0 0 16px #ffd27a}#sppan .sp-lp u{display:block;text-decoration:none;font-size:11px;margin-top:2px}
#sppan .sp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}#sppan .sp-c{border-radius:14px;padding:12px 14px;background:linear-gradient(160deg,#241710cc,#0c0807cc);border:1.5px solid var(--c);display:flex;gap:12px;box-shadow:0 0 22px -10px var(--c)}#sppan .sp-c.no{opacity:.55;border-color:#ffffff22;box-shadow:none}
#sppan .sp-c img{width:108px;height:108px;object-fit:contain;flex:0 0 auto}#sppan .sp-c.no img{filter:brightness(0) invert(.18)}#sppan .sp-c b{font-size:20px;color:var(--c);letter-spacing:2px}#sppan .sp-c small{color:#b8a080;display:block;font-size:12px;line-height:1.5}#sppan .sp-c p{margin:4px 0 0;font-size:13px;line-height:1.55;color:#d8c8a8}
#sppan .sp-bar{height:6px;border-radius:4px;background:#0008;margin:5px 0;overflow:hidden}#sppan .sp-bar i{display:block;height:100%;background:linear-gradient(90deg,#ff7a9a,#ffb0c0)}#sppan .sp-tag{display:inline-block;padding:1px 8px;border-radius:10px;background:#ffd27a22;border:1px solid #ffd27a66;color:#ffd890;font-size:12px;margin-right:4px}`;
  function build() { if (el) return; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    el = document.createElement('div'); el.id = 'spdlg'; el.innerHTML = '<div class="sd-dim"></div><div class="sd-wrap"><div class="sd-por"><img></div><div class="sd-box"><div class="sd-np"><span class="sd-n"></span><span class="sd-t"></span><span class="sd-hr"></span></div><div class="sd-ch"></div><div class="sd-tx"></div><div class="sd-ft">点击 / 空格 继续 · 数字键选择 · Esc 离开</div></div></div>'; document.body.appendChild(el);
    bubs = document.createElement('div'); bubs.id = 'spbubs'; document.body.appendChild(bubs);
    const chip = document.createElement('div'); chip.id = 'spchip'; chip.title = '神灵簿（Y）'; chip.onclick = e => { e.stopPropagation(); openPanel(); }; document.body.appendChild(chip);
    el.querySelector('.sd-box').addEventListener('click', e => { if (e.target.closest('button')) return; advance(); }); el.querySelector('.sd-dim').addEventListener('click', advance);
    window.addEventListener('keydown', onKey, true); }
  const $ = s => el.querySelector(s);
  function setSpeaker(who) { const box = $('.sd-box'), por = $('.sd-por'), img = $('.sd-por img'), n = $('.sd-n'), t = $('.sd-t'), hr = $('.sd-hr'), tx = $('.sd-tx');
    tx.className = 'sd-tx'; por.classList.remove('dim'); { const cs = D.BY[dlg.id]; if (cs && (who === 'y' || who === 'n' || who === 'g') && img.getAttribute('src') !== artOf(cs)) { img.src = artOf(cs); por.style.setProperty('--c', cs.col); } }
    if (who === 'y') { n.textContent = '你'; t.textContent = ''; hr.textContent = ''; tx.classList.add('me'); por.classList.add('dim'); box.style.setProperty('--c', '#8ab8e8'); return; }
    if (who === 'n') { n.textContent = ''; t.textContent = ''; hr.textContent = ''; tx.classList.add('nar'); por.classList.add('dim'); box.style.setProperty('--c', '#6a5a4a'); return; }
    if (who === 'g') { n.textContent = '🧌 斯尼克'; t.textContent = '地精行商'; hr.textContent = ''; por.classList.add('dim'); box.style.setProperty('--c', '#b8e070'); return; }
    const sp = D.BY[who]; if (!sp) return; const m = met(who); n.textContent = sp.n; t.textContent = sp.title; const l = m ? lv(m.aff) : 0; hr.innerHTML = m ? '♥'.repeat(l) + '♡'.repeat(4 - l) + `<small>${D.LV[l]} ${m.aff}</small>` : '';
    img.src = artOf(sp); img.style.filter = sp.artFallback && !ART[sp.art] ? 'hue-rotate(-20deg) saturate(1.3)' : ''; box.style.setProperty('--c', sp.col); por.style.setProperty('--c', sp.col); box.style.setProperty('--c', sp.col); }
  function dlgFloat(t) { if (!el || !dlg.open) return; const d = document.createElement('div'); d.className = 'sd-fl'; d.textContent = t; $('.sd-box').appendChild(d); setTimeout(() => d.remove(), 1300); }
  function typeText(text, who, done) { const tx = $('.sd-tx'), por = $('.sd-por'); clearInterval(dlg.typing); tx.textContent = ''; let i = 0; const full = text; por.classList.toggle('talk', who !== 'y' && who !== 'n' && who !== 'g');
    dlg.cur = { full, done, fin: false }; dlg.typing = setInterval(() => { i += 1; tx.textContent = full.slice(0, i); if (i >= full.length) finishType(); }, 26); }
  function finishType() { clearInterval(dlg.typing); dlg.typing = null; if (!dlg.cur) return; dlg.cur.fin = true; $('.sd-tx').textContent = dlg.cur.full; $('.sd-por').classList.remove('talk'); if (window.SFX && SFX.click) try { SFX.click(); } catch (e) {} }
  function advance() { if (!dlg.open || dlg.choices) return; if (dlg.typing) { finishType(); return; } const c = dlg.cur; if (c && c.fin && c.done) { dlg.cur = null; c.done(); } }
  function say(who, text, next) { setSpeaker(who); $('.sd-ch').innerHTML = ''; dlg.choices = null; const t = fmt(text, dlg.ctx); typeText(t, who, next); }
  function choose(opts, cb) { dlg.choices = opts; const ch = $('.sd-ch'); ch.innerHTML = ''; opts.forEach((o, i) => { const b = document.createElement('button'); b.innerHTML = `<b>${i + 1}</b>${esc(fmt(o.label, dlg.ctx))}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}`; if (o.todo) b.classList.add('todo'); if (o.dis) b.classList.add('dis'); b.onclick = e => { e.stopPropagation(); pickOpt(i); }; ch.appendChild(b); }); dlg.pickCb = cb; }
  function pickOpt(i) { const o = dlg.choices && dlg.choices[i]; if (!o || o.dis) return; dlg.choices = null; $('.sd-ch').innerHTML = ''; SFX.select && SFX.select(); dlg.pickCb(o, i); }
  function onKey(e) { if (pan.open) { if (e.code === 'Escape' || e.code === 'KeyY') { e.stopImmediatePropagation(); e.preventDefault(); closePanel(); } return; }
    if (dlg.open) { e.stopImmediatePropagation(); if (e.code === 'Escape') { closeDlg(); return; } if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); advance(); return; } const n = parseInt(e.key, 10); if (n >= 1 && n <= 9 && dlg.choices) pickOpt(n - 1); return; }
    if (e.code === 'KeyN' && !e.repeat && modOn() && needSight() && G0() && G0().playing && !G0().uiOpen && !(window.Explore && Explore.active)) { e.preventDefault(); sightOn(!sight); return; }
    if (e.code === 'KeyY' && !e.repeat && modOn() && G0() && G0().playing && !G0().uiOpen && !(window.Explore && Explore.active)) { e.preventDefault(); openPanel(); } }

  // ---- 场景解释器 ----
  function applyFx(o, sid) { if (!o) return; const S = G0().S, T = st();
    if (o.a) addAff(sid, o.a); if (o.c) { S.coins += o.c; G0().addCoins && 0; } if (o.i) S.items[o.i] = (S.items[o.i] || 0) + (o.n || 1); if (o.t) G0().toast(o.t, D.BY[sid] ? D.BY[sid].col : '#ffd890', 3.2);
    if (o.f) { T.flags[o.f] = 1; if (o.f === 'sight') sightOn(true, true); if (o.f === 'end_free' || o.f === 'end_stay') finishEnding(o.f === 'end_free' ? 'free' : 'stay'); } }
  function runScene(lines, sid, done) { const q = lines.slice(); let who = sid;
    const step = () => { if (!dlg.open) return; if (!q.length) { done && done(); return; } const it = q.shift();
      if (typeof it === 'string') say(sid, it, step);
      else if (it[0] === 'y') say('y', it[1], step); else if (it[0] === 'g') say('g', it[1], step); else if (it[0] === 'n') say('n', it[1], step); else if (it[0] === 'x') { const who2 = it[1]; if (D.BY[who2] && !met(who2)) addMet(who2, true); say(who2, it[2], step); }
      else if (it[0] === 'fx') { applyFx(it[1], sid); step(); }
      else if (it[0] === '?') { setSpeaker('y'); $('.sd-tx').textContent = ''; $('.sd-tx').className = 'sd-tx me'; choose(it[1].map(o => ({ label: o[0], o })), ch => { const o = ch.o; applyFx(o[1], sid); q.unshift(...o[2]); step(); }); }
      else step(); };
    step(); }

  // ---- 对话入口 / 枢纽 ----
  function openDlg(id, mode) { if (!modOn()) return; build(); const g = G0(); if (dlg.open) return; dlg.open = true; dlg.id = id; dlg.ctx = {}; g.setUI(true); el.classList.add('on'); SFX.open && SFX.open();
    const sp = D.BY[id], m = met(id); if (!m.intro && SC[id] && (SC[id].intro)) { runScene(SC[id].intro, id, () => { m.intro = 1; hub(id, '（她朝你点了点头。）'); }); return; }
    if (mode === 'held' && g.held) { pickHeadFlow(id, g.held.rec); return; }
    hub(id, greet(id)); }
  function greet(id) { const m = met(id), sp = D.BY[id], l = lv(m.aff), T = st(), P = D.CHAT[sp.arche];
    const base = { 0: ['……你好。', '嗯，有事吗？'], 1: ['你来啦。', '今天还好吗？'], 2: ['欢迎回来。', '我刚才还在想你呢。'], 3: ['你来得正好！', '我等你好久啦。'], 4: ['回来啦，我的洞主。', '今天的火，特别暖。'] }[l];
    if (T.end) return pick(SC._main[T.end === 'free' ? 'epilogue_free' : 'epilogue_stay']); return pick(base) + '\n' + fmt(pick(P), dlg.ctx); }
  function closeDlg() { if (!dlg.open) return; clearInterval(dlg.typing); dlg.open = false; dlg.choices = null; dlg.cur = null; el.classList.remove('on'); const g = G0(); g.setUI(false); try { g.lockPointer(); } catch (e) {} g.save && g.save(); checkQueue(); }
  function hub(id, line) { const m = met(id), sp = D.BY[id], T = st(), S = SC[id] || {}; ensureNeed(id);
    const opts = []; const todoSt = S.story && m.sto < 3 && m.aff >= D.LV_AT[m.sto + 1];
    if (todoSt) opts.push({ label: '🌙 她有话想对你说', sub: '个人故事', todo: 1, act: () => story(id) });
    if (S.heart && m.aff >= 90 && !m.heart) opts.push({ label: '💛 她想和你说说心里话', sub: '结缘', todo: 1, act: () => heart(id) });
    opts.push({ label: '💬 随便聊聊', act: () => chat(id) });
    if (S.topics && S.topics.length) opts.push({ label: '📖 聊聊别的话题', sub: `${Object.keys(m.tk).length}/${S.topics.length}`, act: () => topicMenu(id) });
    opts.push({ label: '🧐 请她评评一颗头', sub: m.need && m.need.k !== 'coins' && m.need.k !== 'talk' ? '她想看：' + m.need.lab.replace('想看', '') : '', todo: !!(m.need && ['race', 'trait', 'land'].includes(m.need.k)), act: () => headMenu(id) });
    if (m.need) opts.push({ label: '🎁 她的心愿', sub: m.need.lab, act: () => wish(id) });
    opts.push({ label: '🎲 玩个小游戏', sub: '猜拳 · 抽头比大小', act: () => gameMenu(id) });
    if (id === 'xiaozhu' && litN() >= 9 && friends() >= 6 && !T.end) opts.push({ label: '🕯 举行解咒仪式', sub: '九灯皆亮', todo: 1, act: () => { runScene(SC._main.finale, 'xiaozhu', afterScene(id)); } });
    opts.push({ label: '👋 下次再聊', act: closeDlg });
    setSpeaker(id); $('.sd-tx').className = 'sd-tx'; dlg.cur = null; typeText(fmt(line || greet(id), dlg.ctx), id, () => {}); choose(opts, o => o.act()); }
  const afterScene = id => () => { const T = st(); if (T.flags.rite_go && !T.end) { delete T.flags.rite_go; runScene(SC._main.finale, 'xiaozhu', afterScene('xiaozhu')); return; } G0().save(); if (dlg.open) hub(T.end && id === 'xiaozhu' ? 'xiaozhu' : id, '（她安静了一会儿。）'); };
  function chat(id) { const m = met(id), sp = D.BY[id], now = Date.now(); let gain = 0; if (!m.lastChat || now - m.lastChat > 60000) { gain = 1; m.lastChat = now; }
    st().chatN = (st().chatN || 0) + 1; if (m.need && m.need.k === 'talk') { m.need.n = (m.need.n || 0) + 1; if (m.need.n >= m.need.v) needDone(id); }
    const L = [pick(D.CHAT[sp.arche]), pick(D.CHAT[sp.arche])]; const T = st(); if (litN() > 0 && Math.random() < 0.3) L.push(`九魂灯现在亮了 ${litN()} 盏。${litN() >= 9 ? '……可以准备仪式了。' : '还差 ' + (9 - litN()) + ' 盏。'}`);
    const uniq = [...new Set(L)].slice(0, 2); addAff(id, gain); runScene(uniq, id, () => hub(id, gain ? '（你们聊了一会儿。）' : '（她笑了笑，没有多说。）')); }
  function topicMenu(id) { const m = met(id), S = SC[id], opts = S.topics.map(t => ({ label: t.n, sub: m.tk[t.k] ? '✓ 聊过' : '新', act: () => { const first = !m.tk[t.k]; m.tk[t.k] = 1; if (first) addAff(id, 3); runScene(t.lines, id, () => hub(id, first ? '（她似乎很高兴你问起这个。）' : '（她又讲了一遍，语气比上次更软。）')); } }));
    opts.push({ label: '← 返回', act: () => hub(id, '还想聊点什么？') }); setSpeaker(id); typeText('想聊哪个话题？', id, () => {}); choose(opts, o => o.act()); }
  function story(id) { const m = met(id), S = SC[id]; const sc = S.story[m.sto]; m.sto++; runScene(sc, id, () => { addAff(id, 2); G0().save(); hub(id, '（她看着你，没有说话，但眼睛是亮的。）'); }); }
  function heart(id) { const m = met(id); m.heart = 1; runScene(SC[id].heart, id, () => { hub(id, '……嗯。谢谢你。'); }); }
  function wish(id) { const m = met(id), nd = m.need; setSpeaker(id); typeText('我的心愿是：' + nd.d.replace('她', '我').replace('她想', '我想'), id, () => {}); const opts = [];
    if (nd.k === 'coins') opts.push({ label: `🔮 给她 ${nd.v} 魂晶`, dis: G0().S.coins < nd.v, sub: G0().S.coins < nd.v ? '魂晶不足' : '', act: () => { G0().S.coins -= nd.v; runScene(['哇……真的给我吗？谢谢你！', '我会把它们都换成灯油，让洞里亮一点。'], id, () => { needDone(id); hub(id, '（她抱着那堆魂晶，傻笑了好一会儿。）'); }); } });
    if (['race', 'trait', 'land'].includes(nd.k)) opts.push({ label: '🧐 去挑一颗符合的头给她看', act: () => headMenu(id) });
    opts.push({ label: '← 返回', act: () => hub(id, '不着急。') }); choose(opts, o => o.act()); }
  function headMenu(id) { const hs = headsHere().slice().sort((a, b) => b.c.rar - a.c.rar), sp = D.BY[id], m = met(id); const g = G0();
    if (!hs.length) { runScene(['洞里……还没有头可以看呢。'], id, () => hub(id)); return; }
    const top = hs.slice(0, 14), opts = top.map(r => { const c = r.c, s = taste(sp, c), mt = m.need && needMatch(m.need, c); return { label: `${NMF(c)}`, sub: `${RN[c.rar]} · ${c.raceN}${mt ? ' · 🎯心愿' : ''}${m.seen.includes(r.id) ? ' · 看过' : s >= 4 ? ' · ♥' : ''}`, todo: mt, act: () => pickHeadFlow(id, r) }; });
    opts.push({ label: '← 返回', act: () => hub(id, '改天再看也行。') }); setSpeaker(id); typeText(`想让我看哪一颗？（洞里共有 ${hs.length} 颗，这里列出最稀有的 ${top.length} 颗。手里拿着一颗头时直接按 E 也可以。）`, id, () => {}); choose(opts, o => o.act()); $('.sd-ch').classList.add('sd-hl'); }
  function pickHeadFlow(id, rec) { const m = met(id), r = appraise(id, rec), c = rec.c; $('.sd-ch').classList.remove('sd-hl'); let hit = false; if (m.need && needMatch(m.need, c)) hit = true;
    addAff(id, r.gain); runScene(r.lines, id, () => { if (hit) { const nm = m.need.lab; needDone(id); runScene([`……而且，这正是我想看的${nm.replace('想看', '')}！谢谢你！`], id, () => hub(id, '（她心满意足地晃了晃。）')); } else hub(id, r.stale ? '（她笑了：看过啦。）' : r.vd === 'hate' ? '（她有点尴尬地别开了视线。）' : '（她还在回味刚才那颗头。）'); }); }

  // ---------------- 小游戏（群居感：和先祖们玩） ----------------
  const GL = { // 各性格的输赢反应  [我赢了她, 她赢了我, 平局]
    gentle: ['呀，你赢啦，真厉害。', '我赢了？下次我让你。', '平手，我们好有默契。'], timid: ['诶……你赢了，我、我就知道。', '我赢了？！是我吗？！', '平、平局……太好了，没有人输。'],
    cheerful: ['哇啊啊输了！再来再来！', '耶！我赢啦！你快夸我！', '平局！心有灵犀！'], fierce: ['哼，算你走运。', '哈！这才叫实力！', '再来，这局不算。'],
    pious: ['愿你的好运长久。', '胜负乃是天意，我领受。', '平手，亦是一种圆满。'], sly: ['啧，让你一回而已。', '嘿嘿，承让承让，记账上。', '平局？那就再赌一把大的。'],
    stiff: ['……败北。记录在案。', '胜利。请继续努力。', '平局。判定：无效，重赛。'], vain: ['不可能！本殿下怎么会输！', '哼，这是必然的结果。', '平局？这局不计入殿下的战绩。'],
    cold: ['……你赢了。', '……我赢了。', '……平。'], elder: ['呵呵，后生可畏。', '老头子我，侥幸。', '平手，不错不错。'] };
  function gameMenu(id) { const sp = D.BY[id], opts = [{ label: '✌ 猜拳（三局两胜）', act: () => rps(id, 0, 0, 0) }, { label: '🃏 抽头比大小', sub: '需要洞里至少 3 颗头', dis: headsHere().length < 3, act: () => drawGame(id) }, { label: '← 返回', act: () => hub(id, '不玩了？好吧。') }];
    setSpeaker(id); typeText(pick(['玩什么呢？', '好呀好呀，想玩哪个？', '……来一局吧。']), id, () => {}); choose(opts, o => o.act()); }
  function gameReward(id, win) { const m = met(id), S = G0().S, now = Date.now(); let t = ''; if (!m.lastGame || now - m.lastGame > 90000) { m.lastGame = now; addAff(id, win ? 2 : 1); } if (win) { const c = 20 + S.depth * 12; S.coins += c; t = `（赢得 🔮${c}）`; } return t; }
  function rps(id, me, her, n) { const sp = D.BY[id], N = ['✂ 剪刀', '✊ 石头', '🖐 布'], opts = N.map((x, i) => ({ label: x, act: () => { const h = Math.floor(Math.random() * 3), r = (i - h + 3) % 3; // 0平 1我赢 2她赢（剪0<石1<布2：i=h+1 赢）
        const res = r === 0 ? 2 : r === 1 ? 0 : 1; const nm = me + (res === 0 ? 1 : 0), nh = her + (res === 1 ? 1 : 0), line = GL[sp.arche][res];
        runScene([`（你出 ${N[i]}，她出 ${N[h]}。）`, line], id, () => { if (nm >= 2 || nh >= 2) { const win = nm > nh, t = gameReward(id, win); hub(id, `（${win ? '你赢了这盘' : '她赢了这盘'}，比分 ${nm}:${nh}。）${t}`); } else rps(id, nm, nh, n + 1); }); } })); opts.push({ label: '← 不玩了', act: () => hub(id, '下次再战。') });
    setSpeaker(id); typeText(n ? `比分 ${me}:${her}。下一局——` : '三局两胜。剪刀、石头——', id, () => {}); choose(opts, o => o.act()); }
  function drawGame(id) { const sp = D.BY[id], hs = headsHere(); if (hs.length < 3) { hub(id, '头不够三颗呢。'); return; } const pk = []; while (pk.length < 3) { const r = pick(hs); if (!pk.includes(r)) pk.push(r); }
    const opts = pk.map((r, i) => ({ label: `第 ${i + 1} 颗（盖着的）`, act: () => { const x = Math.random(), hr = x < 0.55 ? 0 : x < 0.83 ? 1 : x < 0.95 ? 2 : x < 0.99 ? 3 : 4, c = r.c, res = c.rar > hr ? 0 : c.rar < hr ? 1 : 2;
      runScene([`（你翻开的是「${NMF(c)}」——${RN[c.rar]}。她抽到的是一颗 ${RN[hr]}。）`, GL[sp.arche][res]], id, () => { const t = gameReward(id, res === 0); hub(id, `（${res === 0 ? '你赢了' : res === 1 ? '她赢了' : '平局'}。）${t}`); }); } }));
    opts.push({ label: '← 算了', act: () => hub(id, '……也行。') }); setSpeaker(id); typeText('我这边抽一颗魂，你从洞里三颗头里挑一颗——谁的魂阶高谁赢。', id, () => {}); choose(opts, o => o.act()); }
  function chessWith(id) { closeDlg(); try { Chess.vsSpirit(id); } catch (e) { console.warn(e); } }

  // ---------------- 结局 ----------------
  function finishEnding(kind) { const T = st(); T.end = kind; T.ch = 4; T.curse = false; if (!T.met.chudai) addMet('chudai', true); T.met.chudai.aff = Math.max(T.met.chudai.aff, 50); T.met.chudai.intro = 1; labelDirty = 1; G0().save && G0().save(); }

  // ---------------- 到访 / 灯 / 主线队列 ----------------
  function scan() { const g = G0(), T = st(), S = g.S; let added = 0;
    for (const r of S.heads) { if (!r.sp && r.c) { r.sp = 1; const l = r.c.loc; if (l) { T.loc[l] = (T.loc[l] || 0) + 1; if (!T.firstHead) T.firstHead = {}; if (!T.firstHead[l]) T.firstHead[l] = NMF(r.c); } added++; } }
    for (const l of D.LANDS) { if (T.lit[l] || (T.loc[l] || 0) < 3) continue; const ok = !window.Recall || S.heads.some(r => r.c && r.c.loc === l && Recall.nKnown(r.c) >= 3); if (ok) { T.lit[l] = 1; queue({ k: 'ward', land: l }); } }
    if (T.flags.prolog) for (const l of D.LANDS) { const sid = D.LAND_SPIRIT[l]; if ((T.loc[l] || 0) >= 1 && sid && !T.met[sid] && !T.q.some(e => e.k === 'arrive' && e.id === sid)) queue({ k: 'arrive', id: sid, land: l }); }
    if (!T.flags.prolog && headsHere().length >= 1 && !T.q.some(e => e.k === 'prolog')) queue({ k: 'prolog' });
    if (T.flags.prolog && litN() >= 5 && !T.flags.half_seen && !T.q.some(e => e.k === 'half')) queue({ k: 'half' });
    if (litN() >= 9 && friends() >= 6 && !T.flags.ready_seen && !T.end && !T.q.some(e => e.k === 'ready')) queue({ k: 'ready' }); }
  function queue(e) { const T = st(); if (!T.q.some(x => x.k === e.k && x.id === e.id && x.land === e.land)) T.q.push(e); }
  let qWait = 0;
  function checkQueue() { const T = st(); if (!T.q.length || busy() || !modOn()) return; const e = T.q[0]; if (performance.now() < qWait) return; const g = G0();
    const play = (lines, sid, extra) => { T.q.shift(); qWait = performance.now() + 4500; build(); dlg.open = true; dlg.id = sid; dlg.ctx = extra || {}; g.setUI(true); ensureSight(); el.classList.add('on'); SFX.open && SFX.open(); return runScene(lines, sid, () => { g.save && g.save(); afterQueued(sid); }); };
    if (e.k === 'prolog') { addMet('xiaozhu', true); play(SC.xiaozhu.prolog, 'xiaozhu', { head: (headsHere()[0] && NMF(headsHere()[0].c)) || '那颗头' }); T.ch = 1; met('xiaozhu').intro = 1; }
    else if (e.k === 'arrive') { const m = addMet(e.id, false); if (T.hide || T.q.filter(x => x.k === 'arrive').length > 2) { T.q.shift(); return; } play(SC[e.id].intro, e.id, { head: T.firstHead && T.firstHead[e.land] || '那颗头', land: LANDN[e.land] }); m.intro = 1; }
    else if (e.k === 'ward') { T.q.shift(); const sid = D.LAND_SPIRIT[e.land], n = litN(); g.toast(`🏮 <b>九魂灯</b> ${LANDI[e.land]} ${LANDN[e.land]} 已点亮（${n}/9）`, '#ffd27a', 4); SFX.levelup && SFX.levelup(); qWait = performance.now() + 2500;
      if (sid && met(sid) && SC[sid].ward && !T.hide && T.q.filter(x => x.k === 'ward').length < 2) { build(); dlg.open = true; dlg.id = sid; dlg.ctx = { land: LANDN[e.land] }; g.setUI(true); ensureSight(); el.classList.add('on'); runScene(SC[sid].ward, sid, () => afterQueued(sid)); } else { S_reward(150 + 50 * n); } }
    else if (e.k === 'half') { T.q.shift(); T.flags.half_seen = 1; if (!T.hide) { build(); dlg.open = true; dlg.id = 'xiaozhu'; dlg.ctx = {}; g.setUI(true); ensureSight(); el.classList.add('on'); runScene(SC._main.half, 'xiaozhu', () => afterQueued('xiaozhu')); } }
    else if (e.k === 'ready') { T.q.shift(); T.flags.ready_seen = 1; if (!T.hide) { build(); dlg.open = true; dlg.id = 'xiaozhu'; dlg.ctx = {}; g.setUI(true); ensureSight(); el.classList.add('on'); runScene(SC._main.ready, 'xiaozhu', () => { afterQueued('xiaozhu'); }); } } }
  function S_reward(n) { G0().S.coins += n; }
  function afterQueued(sid) { const T = st(); closeDlgQuiet(); if (T.flags.rite_go && !T.end) { delete T.flags.rite_go; setTimeout(() => { build(); dlg.open = true; dlg.id = 'xiaozhu'; dlg.ctx = {}; G0().setUI(true); el.classList.add('on'); runScene(SC._main.finale, 'xiaozhu', afterScene('xiaozhu')); }, 400); } }
  function closeDlgQuiet() { clearInterval(dlg.typing); dlg.open = false; dlg.choices = null; dlg.cur = null; el.classList.remove('on'); const g = G0(); g.setUI(false); try { g.lockPointer(); } catch (e) {} }

  // ---------------- 气泡（闲聊 / 拌嘴 / 反应） ----------------
  const bl = []; let nextChat = 8, lastHeld = null, lastN = -1, lastHurt = 0;
  function bubble(id, text, dur) { if (!bubs || !sprites[id]) return; while (bl.length >= 3) { const o = bl.shift(); o.el.remove(); } const sp = D.BY[id], d = document.createElement('div'); d.className = 'sb'; d.style.setProperty('--c', sp.col); d.innerHTML = `<b>${esc(sp.n)}</b>${esc(fmt(text))}`; bubs.appendChild(d); bl.push({ el: d, id, t: dur || (2.6 + text.length * 0.09) }); }
  function tickBubbles(dt) { const cam = G0().camera; for (let i = bl.length - 1; i >= 0; i--) { const b = bl[i]; b.t -= dt; const s = sprites[b.id]; if (b.t <= 0 || !s || !root || !root.visible) { b.el.remove(); bl.splice(i, 1); continue; } const p = new THREE.Vector3(); s.grp.getWorldPosition(p); p.y += 0.85; p.project(cam); if (p.z > 1) { b.el.style.display = 'none'; continue; } b.el.style.display = 'block'; b.el.style.left = Math.max(120, Math.min(innerWidth - 120, (p.x * 0.5 + 0.5) * innerWidth)) + 'px'; b.el.style.top = Math.max(40, (-p.y * 0.5 + 0.5) * innerHeight) + 'px'; } }
  function ambient(dt, now) { if (busy() || st().hide || !inCave()) return; if (!seeing()) { hintT -= dt; if (hintT < 0) { hintT = 150; const T = st(); if (T.flags.sight && Object.keys(sprites).some(id => { const m = met(id); return m && (!m.intro || (SC[id] && SC[id].story && m.sto < 3 && m.aff >= D.LV_AT[m.sto + 1])); })) G0().toast('🕯️ 你感到神灵就在近旁——按 <b>N</b> 开启通神视角', '#ffd8a8', 3.5); } return; } nextChat -= dt; const ids = Object.keys(sprites).filter(i => met(i) && met(i).intro); if (!ids.length) return;
    const g = G0(), h = g.held; if (h !== lastH) { lastH = h; if (h && h.rec && Math.random() < 0.5) { const id = pick(ids), sp = D.BY[id], r = appraise(id, h.rec); met(id).seen = met(id).seen.filter(x => x !== h.rec.id); bubble(id, pick(D.POOL[sp.arche].verdict[r.vd])); } }
    const n = headsHere().length; if (lastN >= 0 && n > lastN && Math.random() < 0.9) { const c = headsHere().slice(-1)[0]; if (c) { const id = ids.slice().sort((a, b) => taste(D.BY[b], c.c) - taste(D.BY[a], c.c))[0], sp = D.BY[id], r = appraise(id, c); met(id).seen = met(id).seen.filter(x => x !== c.id); setTimeout(() => bubble(id, pick(D.POOL[sp.arche].rar[Math.min(4, c.c.rar)])), 900); } } lastN = n;
    const mh = g.st ? (typeof g.st === 'function' ? g.st().maxHp : g.st.maxHp) : 0; if (mh && g.S.hp / mh < 0.35 && now - lastHurt > 60) { lastHurt = now; const id = ids.includes('xiaozhu') ? 'xiaozhu' : ids[0]; bubble(id, pick(['你流了好多血……快去喝药水！', '伤口看着好疼，先坐下来歇歇吧。', '别硬撑，洞里没有人笑话你。'])); }
    if (nextChat <= 0) { nextChat = 14 + Math.random() * 14; const pairs = D.BANTER.filter(p => ids.includes(p[0]) && ids.includes(p[1]));
      if (pairs.length && Math.random() < 0.4) { const b = pick(pairs); b[2].forEach((l, i) => setTimeout(() => { if (st() && !busy()) bubble(l[0], l[1]); }, i * 2900)); nextChat += b[2].length * 2.9; }
      else { const id = pick(ids); bubble(id, pick(D.CHAT[D.BY[id].arche])); } } }
  let lastH = null;
  // 洞内恢复：先祖们在，伤口好得快一点
  let regT = 0; function regen(dt) { regT += dt; if (regT < 1) return; const n = regT; regT = 0; const g = G0(), S = g.S, T = st(), k = Object.keys(T.met).length; if (!k || !inCave() || T.hide) return; const mh = g.st ? (typeof g.st === 'function' ? g.st().maxHp : g.st.maxHp) : 0; if (mh && S.hp < mh) S.hp = Math.min(mh, S.hp + mh * 0.0035 * Math.min(6, k) * (T.end === 'free' ? 2 : 1) * n); }

  // ---------------- 神灵簿（Y） ----------------
  const pan = { open: false }; let panEl = null;
  function questText() { const T = st(), n = litN(); if (!T.flags.prolog) return `<b>第〇章 · 等待</b>　把第一颗头带回洞里，篝火边会有什么东西醒来。`; if (T.end) return `<b>尾声</b>　头颅之咒已${T.end === 'free' ? '解除，先祖们选择留下。' : '被你留下了——你选择了与她们同居。'}继续陪她们聊天、下棋、评头吧。`;
    if (n < 9) return `<b>第一章 · 九魂灯</b>　去九处故乡带回头颅：每处 <b>3 颗</b>，并且其中至少一颗要被你<b>回忆过</b>（用“回忆”叫出她的名字）。已点亮 <b>${n}/9</b>。`;
    if (friends() < 6) return `<b>第二章 · 熟悉</b>　九灯皆亮！但咒还缺“人情”：让至少 <b>6 位</b>先祖与你达到「熟悉」（好感 45）。现在 <b>${friends()}/6</b>。多聊聊、评评头、完成她们的心愿。`; return `<b>终章 · 解咒仪式</b>　九灯皆亮，先祖们也都信任你。去找<b>小烛</b>，举行解咒仪式。`; }
  function openPanel() { if (!modOn()) return; build(); if (pan.open || dlg.open) return; const g = G0(); if (!panEl) { panEl = document.createElement('div'); panEl.id = 'sppan'; document.body.appendChild(panEl); panEl.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a; if (a === 'close') closePanel(); else if (a === 'hide') { toggleHide(); renderPanel(); } }); }
    pan.open = true; g.setUI(true); panEl.classList.add('on'); renderPanel(); SFX.open && SFX.open(); }
  function closePanel() { if (!pan.open) return; pan.open = false; panEl.classList.remove('on'); const g = G0(); g.setUI(false); try { g.lockPointer(); } catch (e) {} }
  function toggleHide() { const T = st(); T.hide = !T.hide; try { localStorage.setItem('soulhead_sp_hide', T.hide ? '1' : ''); } catch (e) {} G0().toast(T.hide ? '🙈 神灵们躲起来了（按 Y 可以叫她们回来）' : '🕯️ 神灵们回来了', '#ffd890', 2.6); updChip(); }
  function renderPanel() { const T = st(), ids = D.ROSTER.filter(r => !r.final || T.met[r.id]); const lamps = D.LANDS.map(l => `<div class="sp-lp ${T.lit[l] ? 'on' : ''}" title="${LANDN[l]}"><i>${LANDI[l]}</i>${LANDN[l]}<u>${T.lit[l] ? '✔ 已点亮' : (T.loc[l] || 0) + '/3'}</u></div>`).join('');
    const cards = ids.map(sp => { const m = T.met[sp.id], l = m ? lv(m.aff) : 0, todo = m && ((SC[sp.id] && SC[sp.id].story && m.sto < 3 && m.aff >= D.LV_AT[m.sto + 1]) || !m.intro);
      const like = m && m.aff >= 20 ? `<p>喜欢：${esc(likeText(sp.likes))}</p>` : '<p style="opacity:.5">喜欢：？？？（好感 20 解锁）</p>', hate = m && m.aff >= 45 ? `<p>讨厌：${esc(likeText(sp.hates) || '几乎没有')}</p>` : '';
      return `<div class="sp-c ${m ? '' : 'no'}" style="--c:${sp.col}"><img src="${artOf(sp)}"><div style="flex:1;min-width:0"><b>${m ? sp.n : '？？？'}</b><small>${m ? sp.title + ' · ' + sp.tag : (sp.land ? '被「' + LANDN[sp.land] + '」的头吸引而来' : '九灯皆亮时现身')}</small>` +
        (m ? `<div class="sp-bar"><i style="width:${m.aff}%"></i></div><small>${'♥'.repeat(l)}${'♡'.repeat(4 - l)} ${D.LV[l]} · 好感 ${m.aff}/100</small>${like}${hate}<p>${todo ? '<span class="sp-tag">✨ 有新的话</span>' : ''}${m.need ? `<span class="sp-tag">🎁 ${esc(m.need.lab)}</span>` : ''}</p>` : `<p>${sp.land ? '带回 1 颗' + LANDN[sp.land] + '的头。' : ''}</p>`) + '</div></div>'; }).join('');
    panEl.innerHTML = `<div class="sp-in"><h2>🕯️ 神灵簿 <small>洞里的先祖们 · ${Object.keys(T.met).length}/${D.ROSTER.length}</small><span class="sp-top"><button data-a="hide">${T.hide ? '👁 叫她们回来' : '🙈 让她们躲起来'}</button><button data-a="close">关闭（Y / Esc）</button></span></h2><div class="sp-q">${questText()}${needSight() && T.flags.sight ? '<br><small style="color:#ffd8a8">按 <b>N</b> 开关「通神视角」——开启时才看得见洞里的神灵。</small>' : ''}${T.hide ? '<br><small style="color:#ff9a8a">神灵目前是隐身状态：看不见她们，也不会被打扰。</small>' : ''}</div><div class="sp-lamps">${lamps}</div><div class="sp-grid">${cards}</div></div>`; }
  function likeText(L) { if (!L) return ''; const p = []; if (L.race) p.push(L.race.map(r => (window.Lore && Lore.RACES[r] ? Lore.RACES[r].n : r)).join('/') + '的头'); if (L.trait) p.push('性格' + L.trait.slice(0, 4).join('、')); if (L.rar) p.push(L.rar[0] === L.rar[1] ? RN[L.rar[0]] : RN[L.rar[0]] + '以上'); return p.join('；'); }
  function updChip() { const c = document.getElementById('spchip'); if (!c) return; const T = st(), n = Object.keys(T.met).length, show = modOn() && inCave() && (n > 0 || T.flags.prolog) && !dlg.open && !pan.open; c.style.display = show ? 'block' : 'none'; if (!show) return;
    const todo = Object.keys(T.met).some(id => { const m = T.met[id]; return !m.intro || (SC[id] && SC[id].story && m.sto < 3 && m.aff >= D.LV_AT[m.sto + 1]); }); c.classList.toggle('todo', todo && !T.hide);
    const h = `${T.hide ? '🙈' : seeing() ? '👁' : '🕯️'} 神灵 ${n} <small>🏮 ${litN()}/9 · ${needSight() && T.flags.sight ? 'N 通神视角 · ' : ''}Y 簿</small>`; if (c._h !== h) { c._h = h; c.innerHTML = h; } }

  // ---------------- 主循环 ----------------
  let scanT = 0, chipT = 0;
  function frame(dt, now) { if (!modOn() || !G0() || !G0().S) return; try {
    if (!el) build(); const T = st(); scanT += dt; if (scanT > 1.5) { scanT = 0; scan(); if (!busy()) checkQueue(); }
    chipT += dt; if (chipT > 0.4) { chipT = 0; updChip(); }
    if (sight && !inCave()) sightOn(false, true); tick3d(dt, now); updAim(); tickBubbles(dt); ambient(dt, now); regen(dt);
  } catch (e) { if (!frame._w) { frame._w = 1; console.warn('Spirits', e); } } }
  function init() { const g = G0(); if (!g || !g.HOOK || !g.S) return false; try { const v = localStorage.getItem('soulhead_sp_hide'); if (v === '1' && st().hide === false && !st().flags.hideInit) { st().hide = true; } st().flags.hideInit = 1; } catch (e) {}
    build(); keyArt(); g.HOOK.frame.push(frame); g.HOOK.e.unshift(onE); g.HOOK.tip.unshift(onTip);
    for (const id in st().met) spawnSprite(id); return true; }
  const wait = setInterval(() => { if (window.G && G.HOOK && G.S && G.scene && window.THREE) { clearInterval(wait); try { init(); } catch (e) { console.warn('Spirits init', e); } } }, 200);
  return { open: openDlg, panel: openPanel, closePanel, get panelOpen() { return pan.open; }, st, D, appraise, taste, addMet, addAff, scan, queue,
    _dbg: { sprites: () => sprites, frame, checkQueue, litN, friends, finishEnding, openPanel, toggleHide } };
})();
