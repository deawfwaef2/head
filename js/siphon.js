// R68 MOD soul_siphon（默认开）：F 回忆里的「汲魂」——食人魔一只手提着首级，另一只手用粗木棒从嘴里（口汲）或从断颈里（颈汲）反复抽动，榨出她的残魂。
//  · 每颗头只能汲一次；成年（≥18 岁）才行。魂阶越高：抽数越多、命越少、节拍越快越窄，但每抽价值越高，终局还有额外奖励。
//  · 只用空格：节拍环（tap）/ 双拍 / 三连拍 / 蓄力松开（hold）/ 连打（mash）。越往后越快越难；连击叠加倍率；失误扣“命”，命尽 = 木棒卡死 → 残魂炸开，魂晶迸出（只拿已累积的 55%）。
//  · 木棒动作跟着节拍：环收缩时往外抽（蓄势），按下的瞬间猛地捅回去；嘴巴按木棒该处的粗细张大 / 收小（`setExpression(ex, true)` 不限幅）。
//  · 表情在她原来的表情上渐变（一阶滞后，不会瞬间换脸）：主导情绪被放大，压力高时眼珠上翻 / 一上一下、舌头垂出，每一抽带来抽搐。
//  · 镜头会换机位 + 抖动；每过 1/4、1/2、3/4 和终局会闪回她生前的温暖片段（理想、家人叮嘱、小习惯）与眼下的反差。
// 依赖：RecallIW（姿势/相机/手）、ModelHeads（setRoll/setTongue/mouth）、Recall、SFX。
window.Siphon = (() => {
  'use strict';
  const on = () => !window.Mods || Mods.on('soul_siphon');
  const PI = Math.PI, sm = x => x * x * (3 - 2 * x), cl = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pk = (a, r) => a[Math.floor((r ? r() : Math.random()) * a.length) % a.length];
  const COL = ['#dfe6f0', '#6fb8ff', '#c47cff', '#ffc84a', '#ff5f9e'], EFN = ['白烟', '蓝焰', '紫电', '金辉', '血月光'], RN = ['凡魂', '灵魂', '英魂', '圣魂', '神魂'];
  const FXs = () => (window.RecallIW && RecallIW.fx) || {};
  let Z = null, root = null, cssOn = false;

  // ---------------- 规则 ----------------
  const ageOf = c => +(c && c.age) || 0;
  function can(rec) {
    const c = rec && rec.c; if (!on()) return { ok: false, why: '汲魂已关闭' };
    if (!c) return { ok: false, why: '她没有魂可汲' }; if (c.sip) return { ok: false, why: '她的残魂已经被你榨干了' };
    if (ageOf(c) < 18) return { ok: false, why: '她还没成年——食人魔也有不碰的东西' };
    return { ok: true };
  }
  function cfg(c) {
    const r = Math.max(0, Math.min(4, c.rar | 0)), R = 7 + 3 * r, lives = r >= 2 ? 2 : 3, unit = 3.4 * (1 + 1.2 * r); let mx = 0;
    for (let i = 0; i < R; i++) mx += unit * (0.6 + 0.05 * i) * 1.4 * (1 + Math.min(0.8, 0.05 * (i + 1)));
    const bonus = Math.round(unit * (2 + r * 1.5)); return { r, R, lives, unit, bonus, max: Math.round(mx + bonus), stars: r + 1 };
  }
  function genRound(i, C, last) {
    const r = C.r, R = C.R;
    const T = Math.max(0.42, 1.15 - 0.04 * i - 0.025 * r), w = Math.max(0.05, (0.19 - 0.012 * r) * (1 - 0.03 * i));
    const pool = ['tap', 'tap']; if (i >= 2) pool.push('double', 'hold'); if (i >= 4) pool.push('mash', 'tap'); if (i >= 8 && r >= 2) pool.push('triple');
    let type = i < 2 ? 'tap' : pk(pool); if (type === last && Math.random() < 0.7) type = pk(pool); if (i === R - 1) type = 'hold';
    const o = { i, type, T, w, done: false, q: '' };
    if (type === 'double') o.gap = Math.max(0.24, 0.52 - 0.02 * i);
    if (type === 'triple') o.gap = Math.max(0.2, 0.4 - 0.015 * i);
    if (type === 'hold') { o.Th = Math.max(0.55, 1.3 - 0.04 * i); o.zc = 0.58 + Math.random() * 0.27; o.zh = Math.max(0.045, 0.16 - 0.006 * i - 0.008 * r); o.startWin = 0.9; if (i === R - 1) o.zh *= 0.8; }
    if (type === 'mash') { o.need = 6 + Math.floor(i / 2) + r; o.dur = Math.max(1.0, 1.5 - 0.02 * i); o.count = 0; }
    return o;
  }

  // ---------------- 木棒 ----------------
  const CL = { L: 0.34, P: [[0, 0.0035], [0.012, 0.0058], [0.04, 0.0092], [0.07, 0.0125], [0.088, 0.0140], [0.097, 0.0128], [0.104, 0.0152], [0.112, 0.0150], [0.125, 0.0118], [0.16, 0.0100], [0.22, 0.0108], [0.30, 0.0125], [0.34, 0.0140]] };
  function radAt(s) { const P = CL.P; if (s <= 0) return P[0][1]; for (let i = 1; i < P.length; i++) if (s <= P[i][0]) { const a = P[i - 1], b = P[i], k = (s - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], k); } return P[P.length - 1][1]; }
  function buildClub(ws) {
    const pts = [], col = [], N = 90; for (let i = 0; i <= N; i++) { const s = CL.L * i / N, r = radAt(s) * ws * (1 + 0.05 * Math.sin(s * 160)); pts.push(new THREE.Vector2(r, s * ws)); }
    const geo = new THREE.LatheGeometry(pts, 28), pos = geo.attributes.position, cs = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const s = pos.getY(i) / ws; if (s < 0.1) c.set('#6a3a22').lerp(new THREE.Color('#8a1c1c'), 0.55 * (1 - s / 0.1)); else if (s > 0.2) c.set('#2e2018'); else c.set('#8a5a32'); const n = 0.9 + 0.2 * Math.sin(pos.getX(i) * 400 + pos.getZ(i) * 310 + s * 90); cs[i * 3] = c.r * n; cs[i * 3 + 1] = c.g * n; cs[i * 3 + 2] = c.b * n; }
    geo.setAttribute('color', new THREE.BufferAttribute(cs, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 })); m.frustumCulled = false; m.renderOrder = 3;
    const g = new THREE.Group(); g.add(m); g.userData.ws = ws; return g;
  }

  // ---------------- 文案 ----------------
  const BIO = c => { try { return (window.Overhear && Overhear.bio && Overhear.bio(c)) || {}; } catch (e) { return {}; } };
  function memories(c) {
    const b = BIO(c), g = c.goal || '把日子过好', L = c.locN || '故乡', nm = c.name || '她', like = b.like || '晒过太阳的干草', quirk = b.quirk || '数星星', bel = c.belief || '神明';
    const W = [`「${g}」——她曾在${L}的灯下，把这句话讲给最小的弟妹听，一屋子的人都笑了。`, `出门那天清早，母亲替她理好衣领：“这次也要平安回来。”她回头挥手：“当然，我答应你。”`, `她有个小习惯：${quirk}。家里人都笑她，却又都惯着她。`, `她最喜欢${like}。那天的${like}，是她这辈子最亮的一个下午。`, `父亲把一枚旧护符塞进她手心：“不管走到哪，别逞强。”她点点头，把它缝进了衣襟。`, `她信${bel}。夜里跪在窗前，替每一个她爱的人轻声念了一遍。`, `同伴递给她半块干饼：“活着回来，我请你喝酒。”她笑着应了。`];
    const K = [`而现在，她的舌头软软地垂在木棒边，再也说不出一个字。`, `衣领还整整齐齐。没有人会告诉那位母亲，这一次，她回不去了。`, `那枚护符不知落在了哪条路边的泥里。`, `「${g}」——如今只剩下一点余温，被你一缕缕从她魂里拧出来。`, `${L}的门口还点着灯。等的人，还不知道。`, `${nm}的睫毛抖了一下。那不是活人的颤。`];
    const used = new Set(), out = []; for (let i = 0; i < 4; i++) { let w; do { w = Math.floor(Math.random() * W.length); } while (used.has(w) && used.size < W.length); used.add(w); out.push({ w: W[w], k: K[(w + i) % K.length] }); } return out;
  }
  const SENS = {
    start: { m: ['你把木棒细的一端抵上去。木头是湿的，带着洞里的凉气，和一点没洗净的血腥味。', '她的牙齿轻轻磕在木头上，咯、咯。'], n: ['你把木棒对准那圈湿冷的断面。凝住的血被顶开，一股温热涌了出来。', '断面的肌肉在木头下轻轻抽动，像在抗拒，又像在迎。'] },
    hit: { m: ['木棒碾过齿列，发出潮湿的、骨头一样的吱嘎声。', '涎液顺着棒身淌到你的虎口，冰凉。', '每推进一寸，她的下颌就被撑开一寸——骨节轻轻响。', '棒子拔出来的时候，带出一缕白雾，雾里有她的体温。'], n: ['颅腔里传来空洞的回响，像在敲一口封了很久的瓮。', '木头刮过断面，湿冷的肉发出细碎的声响。', '血被棒身带出来，温的，黏的，顺着你的手腕往下爬。', '她的头在你掌心里颤了一下——是残魂被拧动时的反射。'] },
    soul: ['一缕缕白烟从她眼角、嘴角被拉出来，缠上木棒，烫得你手心发麻。', '残魂的味道像烧焦的蜂蜜混着铁锈。', '你听见很细的一声叹息，不属于任何活着的东西。', '烟丝在木头上拧成一股，往你的指缝里钻。'],
    spasm: ['她的眼珠向上翻去，只剩两弯青白；另一只却往下沉，像两个互不认识的魂。', '舌尖垂出来，轻轻晃，像风里的一片叶子。', '她的脸在你手里抽了一下——很轻，却是整张脸一起。'],
    miss: ['木棒猛地卡住，震得你手腕发麻。她的牙关咬死了木头。', '节奏断了。残魂缩回深处，像受惊的鱼。', '木头在她骨缝里别了一下，吱——一声长长的刮响。'],
    hold: ['你把木棒一点点往外拖，她的魂也被一寸寸拖出来，拉得老长。'], mash: ['连着抽，连着抽——木棒磨得发烫，她的脸在火光里一明一暗。'],
    end: ['最后一缕魂烟抽尽，她的脸像被掏空的陶器，安静得过分。', '木棒从她身体里抽出来，带出一声湿漉漉的、空空的回响。'], fail: ['木棒卡死——残魂被挤爆，魂晶像碎玻璃一样从她七窍里迸出来！'], abort: ['你把木棒抽了出来。她的魂只被拧出了一半，余下的缩回去，再也拧不动。']
  };

  // ---------------- UI ----------------
  const CSS = `#riw .sip{position:absolute;inset:0;pointer-events:none;display:none}#riw.sipon .sip{display:block}#riw.sipon .rcard,#riw.sipon .rbar,#riw.sipon .hint,#riw.sipon .x,#riw.sipon .pn{display:none!important}
#riw .sip .top{position:absolute;left:50%;top:14px;transform:translateX(-50%);display:flex;gap:18px;align-items:center;background:rgba(14,8,10,.78);border:1px solid rgba(255,200,120,.35);border-radius:14px;padding:7px 20px;font-size:14px;white-space:nowrap}
#riw .sip .top b{color:#ffd27a}#riw .sip .top .lv{letter-spacing:.2em}#riw .sip .top .pl{font:700 18px monospace;color:var(--c)}#riw .sip .top .cb{color:#ff9a6a}
#riw .sip .qte{position:absolute;left:9vw;top:44%;width:240px;height:240px;transform:translateY(-50%)}
#riw .sip .rg{position:absolute;left:50%;top:50%;width:104px;height:104px;margin:-52px 0 0 -52px;border-radius:50%;border:4px solid var(--c);box-shadow:0 0 18px var(--c),inset 0 0 14px #fff3;opacity:0;will-change:transform}
#riw .sip .tg{position:absolute;left:50%;top:50%;width:104px;height:104px;margin:-52px 0 0 -52px;border-radius:50%;border:3px dashed #fff9;display:flex;align-items:center;justify-content:center;font:700 15px system-ui;color:#fff;letter-spacing:.2em;text-shadow:0 0 8px #000;opacity:.0;transition:opacity .15s}
#riw .sip .tg.on{opacity:1}#riw .sip .tg.pop{animation:sipPop .22s}@keyframes sipPop{0%{transform:scale(1.35);box-shadow:0 0 36px var(--c)}100%{transform:scale(1)}}
#riw .sip .fb{position:absolute;left:50%;top:-6px;transform:translateX(-50%);font:900 26px serif;letter-spacing:.15em;text-shadow:0 2px 10px #000;opacity:0}#riw .sip .fb.go{animation:sipFb .8s}@keyframes sipFb{0%{opacity:1;transform:translate(-50%,10px) scale(1.3)}100%{opacity:0;transform:translate(-50%,-26px) scale(1)}}
#riw .sip .bar{position:absolute;left:0;right:0;bottom:6px;height:22px;border-radius:11px;background:#0009;border:1px solid #fff4;overflow:hidden;opacity:0}
#riw .sip .bar .z{position:absolute;top:0;bottom:0;background:linear-gradient(90deg,#ffe28a55,#ffe28acc,#ffe28a55);box-shadow:0 0 12px #ffe28a}#riw .sip .bar .f{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,var(--c),#fff)}
#riw .sip .hintk{position:absolute;left:0;right:0;bottom:-26px;text-align:center;font-size:12.5px;color:#ffd9a0;text-shadow:0 1px 6px #000}
#riw .sip .mem{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);width:min(620px,70vw);text-align:center;opacity:0;transition:opacity .9s;text-shadow:0 2px 10px #000}#riw .sip .mem.on{opacity:1}
#riw .sip .mem .w{font:italic 20px/1.7 serif;color:#f6e9d0;padding:8px 22px;background:linear-gradient(90deg,transparent,rgba(30,20,10,.7) 15%,rgba(30,20,10,.7) 85%,transparent)}#riw .sip .mem .k{margin-top:10px;font:700 17px/1.6 serif;color:#ff6a6a;letter-spacing:.06em;opacity:0;transition:opacity 1s 1.4s}#riw .sip .mem.on .k{opacity:1}
#riw .sip .res{position:absolute;left:5vw;top:40%;transform:translate(0,-50%) scale(.9);min-width:340px;text-align:center;padding:20px 30px;background:rgba(14,8,10,.9);border:1px solid var(--c);border-radius:16px;box-shadow:0 0 40px var(--c);opacity:0;transition:opacity .5s,transform .5s}#riw .sip .res.on{opacity:1;transform:translate(0,-50%) scale(1)}
#riw .sip .res h2{margin:0 0 6px;font:900 26px serif;letter-spacing:.2em;color:var(--c)}#riw .sip .res .n{font:900 40px monospace;color:#ffe28a}#riw .sip .res p{margin:6px 0 0;font-size:13px;color:#d8c8b0}
#riw .sip .flw{position:absolute;inset:0;background:#fff;opacity:0}#riw .sip .vgn{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 35%,var(--c) 160%);opacity:0;mix-blend-mode:screen}
#riw .sip .lives{letter-spacing:.15em}`;
  function ui() {
    if (!cssOn) { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); cssOn = true; }
    const host = document.getElementById('riw'); if (!host) return null;
    if (root && root.isConnected) return root;
    root = document.createElement('div'); root.className = 'sip';
    root.innerHTML = `<div class="vgn"></div><div class="top"><span class="rd"></span><span class="lv"></span><span class="lives"></span><span class="cb"></span><span class="pl"></span></div>
      <div class="qte"><div class="tg"><span>空格</span></div><div class="rg"></div><div class="rg"></div><div class="rg"></div><div class="fb"></div><div class="bar"><div class="z"></div><div class="f"></div></div><div class="hintk"></div></div>
      <div class="mem"><div class="w"></div><div class="k"></div></div><div class="res"></div><div class="flw"></div>`;
    host.appendChild(root); return root;
  }
  const q = s => root.querySelector(s);

  // ---------------- 开始 / 结束 ----------------
  function begin(o) { // { rec, h, mode:'m'|'n', api:{sub, onEnd, snd}, S }
    if (Z || !on()) return false; const rec = o.rec, c = rec.c, ck = can(rec); if (!ck.ok) { o.api.sub(`<span class="d">${esc(ck.why)}。</span>`); return false; }
    if (!ui()) return false; const C = cfg(c), hb = o.h.hb; if (!hb || !hb.setTongue) return false;
    const L = rec.look || (rec.look = {}), col = COL[c.rar | 0];
    Z = { o, rec, h: o.h, hb, c, C, mode: o.mode, t: 0, phase: 'intro', ri: 0, round: null, last: '', lives: C.lives, pool: 0, combo: 0, best: 0, cnt: { perfect: 0, good: 0, bad: 0, miss: 0 }, stress: 0.1, pressT: -9, mag: 0, kind: '', depth: 0.05, ws: 1.55, club: null, held: false, memI: 0, mems: memories(c), memT: -9, shot: 0, shotT: 0, shake: 0, sub: 0,
      ch: Object.assign({}, L.ex || {}), roll: (L.rl || [0, 0]).slice(), tg: (L.tg || 0) * 0.04, tgDrop: (L.tg || 0) * 0.3, base: { ex: Object.assign({}, L.ex || {}), rl: (L.rl || [0, 0]).slice(), tg: L.tg || 0 }, pat: pk(['both', 'split', 'alt']), altS: 1, jaw: 0, wisps: [], bursts: [], col, endT: 0, kick: 0, tw: 0, spasm: 0, seen: {} };
    Z.D = Z.mode === 'm' ? { shallow: 0.008, mid: 0.05, deep: 0.112 } : { shallow: 0.03, mid: 0.065, deep: 0.125 };
    root.style.setProperty('--c', col); const host = document.getElementById('riw'); host.classList.add('sipon'); host.style.setProperty('--c', col);
    q('.lv').innerHTML = `${RN[c.rar | 0]} · ${EFN[c.rar | 0]}`; q('.res').classList.remove('on'); q('.mem').classList.remove('on');
    Z.round = null; Z.nextAt = 1.4; Z.active = true; api().sub(`<span class="d">${esc(pk(SENS.start[Z.mode], null))}</span>`); FXs().snd && FXs().snd('lift');
    return true;
  }
  const api = () => Z.o.api;
  function end(kind) {
    if (!Z || Z.phase === 'end') return; const c = Z.c, C = Z.C; Z.phase = 'end'; Z.endT = 0; Z.kind2 = kind;
    let pay = kind === 'done' ? Z.pool + C.bonus : kind === 'fail' ? Math.floor(Z.pool * 0.55) : Math.floor(Z.pool * 0.7);
    pay = Math.max(0, Math.round(pay)); Z.pay = pay; const G = window.G;
    try { G.addCoins && G.addCoins(pay); } catch (e) { }
    let extra = ''; try {
      if (kind === 'done' && C.r >= 2 && window.Recall && Recall.known && !Recall.known(c, 'goal')) { Recall.reveal(Z.rec, 'goal', true); extra += '想起了她生前最想做的事　'; }
      if (kind === 'done' && C.r >= 3 && window.Sack && Sack.stashAdd && Sack.mk) { Sack.stashAdd(Sack.mk('dust', C.r - 1)); extra += `魂尘×${C.r - 1}　`; }
    } catch (e) { }
    c.sip = { k: kind, n: pay, t: Date.now() }; const L = Z.rec.look || (Z.rec.look = {}); L.pale = Math.max(L.pale || 0, 0.42); try { if (Z.hb.U && Z.hb.U.pale) Z.hb.U.pale.value = L.pale; } catch (e) { }
    try { G.save && G.save(); } catch (e) { }
    const R = q('.res'); R.innerHTML = `<h2>${kind === 'done' ? '残魂榨尽' : kind === 'fail' ? '残魂炸开' : '半途抽出'}</h2><div class="n">+${pay} 🔮</div><p>完美 ${Z.cnt.perfect} · 好 ${Z.cnt.good} · 偏 ${Z.cnt.bad} · 失误 ${Z.cnt.miss}　最高连击 ${Z.best}</p>${extra ? `<p style="color:#9fe08a">${extra}</p>` : ''}<p>${kind === 'done' ? `完成奖励 +${C.bonus}` : kind === 'fail' ? '木棒卡死，只拿到已累积的 55%' : '只拿到已累积的 70%'}</p>`; R.classList.add('on');
    api().sub(`<b>${esc(pk(SENS[kind === 'done' ? 'end' : kind], null))}</b>`);
    if (kind !== 'abort') memory(3);
    burst(kind === 'fail' ? 90 + C.r * 22 : 30 + C.r * 12, kind === 'fail');
    const X = FXs(); if (X.snd) { X.snd('coins'); X.snd('heavy'); } Z.shake = Math.max(Z.shake, kind === 'fail' ? 0.05 : 0.02);
    try { window.dispatchEvent(new CustomEvent('siphon-end', { detail: { rec: Z.rec, pay, kind } })); } catch (e) { }
  }
  function close(silent) {
    if (!Z) return; const L = Z.rec.look || {}, hb = Z.hb;
    try { hb.setExpression(L.ex || {}); hb.setRoll(...(L.rl || [0, 0])); hb.setTongue((L.tg || 0) * 0.04, 0, (L.tg || 0) * 0.3); if (hb.setSway) hb.setSway(new THREE.Vector3()); } catch (e) { }
    if (Z.club && Z.club.parent) Z.club.parent.remove(Z.club); if (Z.arm && Z.arm.parent) Z.arm.parent.remove(Z.arm); { const hs = Z.o.rigR && Z.o.rigR.children; if (hs) { if (hs[1]) hs[1].visible = true; if (hs[2]) hs[2].visible = true; } } for (const w of Z.wisps) w.m.parent && w.m.parent.remove(w.m); for (const b of Z.bursts) b.m.parent && b.m.parent.remove(b.m);
    if (Z.pts && Z.pts.parent) Z.pts.parent.remove(Z.pts); if (Z.cry && Z.cry.parent) Z.cry.parent.remove(Z.cry);
    const o = Z.o; document.getElementById('riw').classList.remove('sipon'); Z = null; try { o.api.onEnd && o.api.onEnd(); } catch (e) { }
  }
  function abort() { if (!Z) return; if (Z.phase === 'end') { close(); return; } if (Z.phase === 'play' || Z.phase === 'intro') end(Z.pool > 0 ? 'abort' : 'abort'); }

  // ---------------- 回合 ----------------
  function startRound() {
    if (Z.ri >= Z.C.R) { Z.phase = 'finish'; Z.finT = 0.9; return; }
    const r = genRound(Z.ri, Z.C, Z.last); r.t0 = Z.t + (Z.ri ? 0.3 : 0.1); Z.round = r; Z.last = r.type;
    if (r.type === 'tap') r.tg = [r.t0 + r.T]; else if (r.type === 'double') r.tg = [r.t0 + r.T, r.t0 + r.T + r.gap]; else if (r.type === 'triple') r.tg = [r.t0 + r.T, r.t0 + r.T + r.gap, r.t0 + r.T + r.gap * 2]; else r.tg = [];
    r.hi = 0; if (r.type === 'hold') { api().sub(`<span class="d">${esc(SENS.hold[0])}</span>`); } else if (r.type === 'mash') api().sub(`<span class="d">${esc(SENS.mash[0])}</span>`);
    if (r.type === 'mash') r.end = r.t0 + 0.4 + r.dur;
    const qd = q('.qte'); q('.bar').style.opacity = r.type === 'hold' || r.type === 'mash' ? 1 : 0;
    if (r.type === 'hold') { const z = q('.z'); z.style.left = (r.zc - r.zh) * 100 + '%'; z.style.width = r.zh * 200 + '%'; z.style.display = ''; q('.f').style.width = '0%'; q('.hintk').textContent = '按住空格，在亮区松开'; }
    else if (r.type === 'mash') { q('.z').style.display = 'none'; q('.f').style.width = '0%'; q('.hintk').textContent = `连按空格 ×${r.need}`; }
    else q('.hintk').textContent = r.type === 'tap' ? '环收拢时按空格' : r.type === 'double' ? '连按两下' : '连按三下';
    // 镜头：每 3 抽换机位，第 1 次翻眼 / 连击 5 时额外切
    if (Z.ri % 3 === 0 && Z.ri) Z.shot = (Z.shot + 1) % 5;
  }
  function resolve(qk) {
    const r = Z.round; if (!r || r.done) return; r.done = true; r.q = qk; Z.cnt[qk]++;
    const mult = { perfect: 1.4, good: 1, bad: 0.35, miss: 0 }[qk];
    if (qk === 'perfect' || qk === 'good') { Z.combo++; Z.best = Math.max(Z.best, Z.combo); } else { Z.combo = 0; if (qk === 'miss') Z.lives--; }
    const gain = Math.round(Z.C.unit * (0.6 + 0.05 * r.i) * mult * (1 + Math.min(0.8, 0.05 * Z.combo)));
    Z.pool += gain; stroke(qk, gain); Z.ri++;
    Z.stress = cl(0.14 + 0.78 * Z.ri / Z.C.R + 0.05 * Math.min(6, Z.combo) * 0.2, 0, 1);
    const qte = q('.qte'), fb = q('.fb'); fb.textContent = { perfect: '完美', good: '好', bad: '偏了', miss: '失误' }[qk] + (gain ? ` +${gain}` : ''); fb.style.color = { perfect: '#ffe28a', good: '#9fe8a0', bad: '#ffb070', miss: '#ff6a6a' }[qk]; fb.classList.remove('go'); void fb.offsetWidth; fb.classList.add('go'); const tg = q('.tg'); tg.classList.remove('pop'); void tg.offsetWidth; tg.classList.add('pop');
    // 文案：命中给触感，翻眼/吐舌阶段给抽搐，每 3 抽给魂烟
    const X = FXs(), md = Z.mode; if (qk === 'miss') { api().sub(`<span class="d">${esc(pk(SENS.miss))}</span>`); }
    else if (Z.ri % 3 === 1) api().sub(`<span class="d">${esc(pk(SENS.hit[md]))}</span>`); else if (Z.ri % 3 === 2 && Z.stress > 0.45) api().sub(`<span class="d">${esc(pk(SENS.spasm))}</span>`); else if (Z.ri % 3 === 0) api().sub(`<span class="d">${esc(pk(SENS.soul))}</span>`);
    const m = Math.floor(Z.C.R * 0.25), mq = [m, Math.floor(Z.C.R * 0.5), Math.floor(Z.C.R * 0.75)]; if (Z.memI < 3 && Z.ri >= mq[Z.memI]) memory(Z.memI++);
    if (Z.lives <= 0) { Z.phase = 'fail'; Z.failT = 0; Z.round = null; X.snd && X.snd('heavy'); api().sub(`<b style="color:#ff8a7a">${esc(SENS.fail[0])}</b>`); Z.shake = 0.06; flash(1); return; }
    Z.round = null; Z.nextAt = Z.t + 0.28; Z.wait = true;
  }
  function stroke(qk, gain) {
    Z.pressT = Z.t; Z.kind = qk; Z.mag = { perfect: 1, good: 0.75, bad: 0.42, miss: 0.5 }[qk]; Z.kick = Z.mag; Z.spasm = Math.min(1, Z.spasm + 0.55 * Z.mag);
    Z.shake = Math.max(Z.shake, qk === 'miss' ? 0.016 : 0.006 + 0.012 * Z.mag); if (Z.pat === 'alt') Z.altS *= -1;
    const X = FXs(), t = (window.SFX && SFX.ctx) ? SFX.ctx.currentTime : 0;
    try {
      if (qk === 'miss') { X.noise && X.noise(t, 0.3, 0.13, 'bandpass', 320, 110, 2.2); X.tone && X.tone(t, 78, 46, 0.32, 0.12, 'sawtooth'); }
      else { X.tone && X.tone(t, 100, 46, 0.2, 0.2 * Z.mag + 0.05, 'sine'); X.noise && X.noise(t, 0.14, 0.09 * Z.mag + 0.03, 'bandpass', 700, 260, 1.4); window.SFX && SFX.squish && SFX.squish(0.3 * Z.mag); if (qk === 'perfect') X.tone && X.tone(t + 0.02, 1500, 2300, 0.28, 0.03, 'triangle'); }
    } catch (e) { }
    if (qk !== 'miss') spawnWisps(Math.round((3 + Z.C.r * 1.5) * Z.mag) + 1);
    if (Z.combo === 5 || Z.combo === 10) Z.shot = (Z.shot + 2) % 5;
    if (Z.stress > 0.5 && !Z.seen.roll) { Z.seen.roll = 1; Z.shot = 3; }
  }
  function memory(i) {
    const M = Z.mems[Math.min(i, Z.mems.length - 1)]; const m = q('.mem'); m.classList.remove('on'); q('.mem .w').textContent = M.w; q('.mem .k').textContent = M.k; void m.offsetWidth; m.classList.add('on'); Z.memT = Z.t; Z.shot = 4; Z.vg = 1;
    clearTimeout(Z.memTm); Z.memTm = setTimeout(() => { m.classList.remove('on'); }, 5200);
  }
  function flash(v) { const f = q('.flw'); f.style.transition = 'none'; f.style.opacity = v * 0.7; void f.offsetWidth; f.style.transition = 'opacity .7s'; f.style.opacity = 0; }

  // ---------------- 输入（只有空格）----------------
  function press() {
    if (!Z || !Z.active) return; if (Z.phase === 'end') { if (Z.endT > 1.2) close(); return; } if (Z.phase !== 'play') return; Z.held = true; const r = Z.round; if (!r || r.done || Z.t < r.t0) return;
    if (r.type === 'tap' || r.type === 'double' || r.type === 'triple') {
      const tg = r.tg[r.hi]; if (Z.t < tg - r.w * 3.4) return; const dt = Math.abs(Z.t - tg);
      const qk = dt <= r.w * 0.42 ? 'perfect' : dt <= r.w ? 'good' : dt <= r.w * 1.8 ? 'bad' : 'miss';
      r.hq = r.hq || []; r.hq.push(qk); r.hi++;
      if (qk === 'miss' || r.hi >= r.tg.length) { const ord = ['miss', 'bad', 'good', 'perfect']; const worst = r.hq.reduce((a, b) => ord.indexOf(b) < ord.indexOf(a) ? b : a); resolve(worst); }
      else { // 多拍：中间一拍先给反馈
        Z.pressT = Z.t; Z.mag = 0.6; Z.kick = 0.6; Z.shake = Math.max(Z.shake, 0.007); const t = window.SFX && SFX.ctx ? SFX.ctx.currentTime : 0; try { FXs().tone(t, 110, 52, 0.15, 0.14, 'sine'); } catch (e) { } const tgE = q('.tg'); tgE.classList.remove('pop'); void tgE.offsetWidth; tgE.classList.add('pop'); }
    } else if (r.type === 'hold') { if (!r.ph && Z.t <= r.t0 + r.startWin) { r.ph = Z.t; try { FXs().snd('hush'); } catch (e) { } } }
    else if (r.type === 'mash') { r.count++; Z.pressT = Z.t; Z.mag = 0.5; Z.kick = 0.5; Z.spasm = Math.min(1, Z.spasm + 0.12); Z.shake = Math.max(Z.shake, 0.005); const t = window.SFX && SFX.ctx ? SFX.ctx.currentTime : 0; try { FXs().tone(t, 120, 60, 0.1, 0.1, 'sine'); } catch (e) { } if (r.count >= r.need) resolve(r.count > r.need + 3 ? 'perfect' : 'good'); }
  }
  function release() {
    if (!Z || !Z.active) return; Z.held = false; const r = Z.round; if (!r || r.done || r.type !== 'hold' || !r.ph) return;
    const f = (Z.t - r.ph) / r.Th, d = Math.abs(f - r.zc); resolve(d <= r.zh * 0.4 ? 'perfect' : d <= r.zh ? 'good' : d <= r.zh * 2 ? 'bad' : 'miss');
  }

  // ---------------- 粒子 ----------------
  function ensureFx(cam) {
    if (Z.pts) return; const N = 160, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3), c = new Float32Array(N * 3); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const sp = document.createElement('canvas'); sp.width = sp.height = 64; const x = sp.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, '#fff8'); gr.addColorStop(1, '#fff0'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    Z.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.05, map: new THREE.CanvasTexture(sp), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); Z.pts.frustumCulled = false; Z.pts.renderOrder = 5; Z.ptsN = N; Z.pl = []; cam.add(Z.pts);
    Z.cry = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.008, 0), new THREE.MeshStandardMaterial({ color: '#ffe28a', emissive: '#ffb020', emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.2 }), 260); Z.cry.count = 0; Z.cry.frustumCulled = false; Z.cry.renderOrder = 6; Z.cl = []; cam.add(Z.cry);
  }
  function spawnWisps(n) {
    if (!Z.src) return; for (let i = 0; i < n && Z.pl.length < Z.ptsN; i++) { const s = Z.src[Math.random() < 0.35 ? 1 : 0]; Z.pl.push({ p: s.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02)), v: new THREE.Vector3((Math.random() - 0.5) * 0.25, 0.1 + Math.random() * 0.25, (Math.random() - 0.5) * 0.2), t: 0, life: 0.9 + Math.random() * 0.7 }); }
  }
  function burst(n, big) {
    if (!Z.src || !Z.cry) return; for (let i = 0; i < n && Z.cl.length < 260; i++) { const s = Z.src[0]; Z.cl.push({ p: s.clone(), v: new THREE.Vector3((Math.random() - 0.5) * (big ? 1.7 : 1.0), 0.5 + Math.random() * (big ? 1.7 : 1.0), (Math.random() - 0.2) * (big ? 1.4 : 0.8)), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6), w: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8), t: 0, life: 2.6 + Math.random() * 1.2, s: 0.7 + Math.random() * 0.9 }); }
  }
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  function updFx(dt) {
    const g = Z.pts.geometry, pos = g.attributes.position, col = g.attributes.color, base = new THREE.Color(Z.col); let n = 0;
    for (let i = Z.pl.length - 1; i >= 0; i--) { const w = Z.pl[i]; w.t += dt; if (w.t >= w.life) { Z.pl.splice(i, 1); continue; } const k = w.t / w.life, tgt = Z.grip || Z.src[0]; w.v.lerp(_p.copy(tgt).sub(w.p).multiplyScalar(2.2), dt * 2.5 * (0.3 + k)); w.p.addScaledVector(w.v, dt); }
    for (const w of Z.pl) { const k = w.t / w.life, a = Math.sin(k * PI); pos.setXYZ(n, w.p.x, w.p.y, w.p.z); col.setXYZ(n, base.r * a + 0.3 * a, base.g * a + 0.3 * a, base.b * a + 0.3 * a); n++; }
    for (let i = n; i < Z.ptsN; i++) { pos.setXYZ(i, 0, -9, 0); col.setXYZ(i, 0, 0, 0); } pos.needsUpdate = true; col.needsUpdate = true;
    for (let i = Z.cl.length - 1; i >= 0; i--) { const b = Z.cl[i]; b.t += dt; if (b.t >= b.life) { Z.cl.splice(i, 1); continue; } b.v.y -= 1.9 * dt; b.p.addScaledVector(b.v, dt); if (b.p.y < -0.55 && b.v.y < 0) { b.v.y *= -0.45; b.v.x *= 0.7; b.v.z *= 0.7; b.p.y = -0.55; } b.r.x += b.w.x * dt; b.r.y += b.w.y * dt; }
    Z.cry.count = Z.cl.length; Z.cl.forEach((b, i) => { _q.setFromEuler(b.r); const k = Math.min(1, (b.life - b.t) * 1.5) * b.s; _s.set(k, k, k); _m4.compose(b.p, _q, _s); Z.cry.setMatrixAt(i, _m4); const hue = 0.1 + 0.08 * ((i * 37) % 7) / 7; Z.cry.setColorAt && Z.cry.setColorAt(i, _c.setHSL(hue, 0.9, 0.6)); }); Z.cry.instanceMatrix.needsUpdate = true; if (Z.cry.instanceColor) Z.cry.instanceColor.needsUpdate = true;
  }

  // ---------------- 每帧：姿势 / 表情 ----------------
  function pose(dt, now, K) { // → tgt（相机局部的 H/L/R/C 姿势）；R 手之后在 post() 里按木棒位置覆盖
    Z.t += dt; const S = K.S, C = Z.C, mode = Z.mode;
    // 阶段机
    if (Z.phase === 'intro') { if (Z.t > Z.nextAt) { Z.phase = 'play'; startRound(); } }
    else if (Z.phase === 'play') {
      if (!Z.round && Z.wait && Z.t >= Z.nextAt) { Z.wait = false; startRound(); }
      const r = Z.round;
      if (r && !r.done && Z.t >= r.t0) {
        if (r.type === 'tap' || r.type === 'double' || r.type === 'triple') { const tg = r.tg[r.hi]; if (Z.t > tg + r.w * 1.8) { r.hq = r.hq || []; r.hq.push('miss'); r.hi++; resolve('miss'); } }
        else if (r.type === 'hold') {
          if (!r.ph) { if (Z.t > r.t0 + r.startWin) resolve('miss'); } else if (Z.held) { const f = (Z.t - r.ph) / r.Th; q('.f').style.width = Math.min(100, f * 100) + '%'; if (f > r.zc + r.zh * 2) resolve('miss'); }
        } else if (r.type === 'mash') { q('.f').style.width = Math.min(100, r.count / r.need * 100) + '%'; if (Z.t > r.end) resolve(r.count >= r.need * 0.6 ? 'bad' : 'miss'); }
      }
    } else if (Z.phase === 'finish') { Z.finT -= dt; if (Z.finT <= 0) end('done'); }
    else if (Z.phase === 'fail') { Z.failT += dt; Z.shake = Math.max(Z.shake, 0.03 * (1 - Z.failT / 1.5)); if (Z.failT > 1.3 && !Z.burst0) { Z.burst0 = 1; end('fail'); } }
    else if (Z.phase === 'end') { Z.endT += dt; if (Z.endT > 7) close(); }
    // 压力 / 抽搐
    Z.kick *= Math.exp(-dt * 9); Z.spasm *= Math.exp(-dt * 2.2); const since = Z.t - Z.pressT;
    // 木棒深度：环收缩时往外抽（蓄势），按下瞬间捅回去
    const D = Z.D, r = Z.round; let want;
    if (since < 0.1 && Z.pressT > 0) want = lerp(D.mid, D.deep, Z.mag * (Z.kind === 'miss' ? 0.55 : 1));
    else if (Z.phase === 'fail') want = D.mid + Math.sin(Z.t * 55) * 0.012;
    else if (r && !r.done && Z.t >= r.t0) {
      if (r.type === 'hold') want = r.ph ? lerp(D.mid, D.shallow, sm(cl((Z.t - r.ph) / r.Th, 0, 1))) : D.mid;
      else if (r.type === 'mash') want = D.mid + Math.sin(Z.t * 30) * 0.02;
      else { const tg = r.tg[Math.min(r.hi, r.tg.length - 1)], st = r.hi ? r.tg[r.hi - 1] : r.t0, p = cl((Z.t - st) / Math.max(0.1, tg - st), 0, 1); want = lerp(D.mid, D.shallow, sm(p)); }
    } else want = D.mid + Math.sin(Z.t * 2.2) * 0.004;
    Z.depth += (want - Z.depth) * (1 - Math.exp(-dt * (since < 0.1 && Z.pressT > 0 ? 80 : 11)));
    // 嘴：按木棒在唇线处的粗细张开（颈汲：只有轻微颅压）
    const lip = radAt(Z.depth), open = Z.mode === 'm' ? cl((lip - 0.0035) / (0.0152 - 0.0035), 0, 1) : 0;
    Z.jaw += (open - Z.jaw) * (1 - Math.exp(-dt * 42));
    faceStep(dt, now);
    // 相机机位
    const SH = [{ cp: 0, cy: 0, dist: 0, hy: 0, fov: 0 }, { cp: 0.2, cy: 0.12, dist: -0.02, hy: 0.25, fov: 2 }, { cp: -0.05, cy: -0.25, dist: 0.0, hy: -0.45, fov: 0 }, { cp: 0.0, cy: 0.05, dist: -0.14, hy: 0, fov: -9 }, { cp: -0.1, cy: 0, dist: 0.1, hy: 0.15, fov: 4 }][Z.shot];
    const tg = K.cp(K.BASE), ph = Math.sin(Z.t * 1.7) * 0.01;
    // 头位置：口汲＝脸朝右侧（木棒从右侧水平进来，侧面看得见张嘴）；颈汲＝头后仰，断面朝向镜头右下
    if (mode === 'm') { tg.H = [-0.03, -0.06 + ph, -0.42, -0.1, 1.2 + SH.hy, -0.04]; }
    else { tg.H = [0.0, -0.01 + ph, -0.42, -1.25, 0.85 + SH.hy, 0.1]; }
    tg.H[2] += SH.dist * 0.6; tg.C = [0, 0, 0, SH.cp * 0.5 - 0.06, SH.cy * 0.4, Math.sin(Z.t * 0.9) * 0.01, -14 + SH.fov];
    tg.L = [-0.105, -0.2, -0.43, 0.95, 0, PI / 2 + 0.35];
    // 抽动：头被棒子顶得往后一颤、一抖（跟着 stroke）
    const kk = Z.kick, jr = Math.sin(Z.t * 52) * kk;
    tg.H[2] -= 0.03 * kk; tg.H[3] += (mode === 'm' ? -0.1 : 0.12) * kk + jr * 0.04; tg.H[4] += jr * 0.06; tg.H[5] += Math.sin(Z.t * 37) * 0.06 * (kk + Z.spasm * 0.3);
    tg.C[6] -= 4 * kk; S.shake = Math.max(S.shake, Z.shake); Z.shake *= Math.exp(-dt * 6); S.rshake = Math.max(S.rshake || 0, Z.shake * 2.2);
    if (Z.hb.setSway) Z.hb.setSway(_p.set(Math.sin(Z.t * 14) * 0.03 * (0.3 + Z.spasm), 0.01 * kk, Math.cos(Z.t * 11) * 0.02 * (0.3 + Z.spasm)));
    // UI
    uiStep(dt); return tg;
  }
  function dom(base) { let b = 'sad', v = -1; for (const k of ['sad', 'angry', 'surprised', 'happy', 'relaxed']) if ((base[k] || 0) > v) { v = base[k] || 0; b = k; } return v > 0.1 ? b : 'sad'; }
  function faceStep(dt, now) {
    const B = Z.base.ex, s = Z.stress, T = Object.assign({}, B), add = (k, v) => { T[k] = cl((T[k] || 0) + v, 0, 1); }, hb = Z.hb;
    const dm = dom(B); add(dm, 0.28 * s + 0.1 * Z.spasm);
    if (s > 0.3) add('angry', 0.18 * Math.min(1, (s - 0.3) * 2) * (1 - Z.spasm * 0.5)); if (s > 0.6) add('relaxed', 0.25 * (s - 0.6) * 2.5);
    T.blink = cl((B.blink || 0) * 0.55 + 0.2 * s + 0.3 * Z.spasm * Math.abs(Math.sin(now * 17)), 0, 0.9);
    if (Z.mode === 'm') { T.aa = 0.92 * Z.jaw + (B.aa || 0) * (1 - Z.jaw); T.oh = 0.5 * Z.jaw + (B.oh || 0) * (1 - Z.jaw); T.ee = (B.ee || 0) * (1 - Z.jaw); }
    else { T.aa = cl((B.aa || 0) + 0.18 * s + 0.3 * Z.kick, 0, 0.8); }
    const ch = Z.ch, keys = new Set([...Object.keys(ch), ...Object.keys(T)]); const ex = {};
    for (const k of keys) { const rate = (k === 'aa' || k === 'oh') ? 40 : k === 'blink' ? 14 : 4.2; ch[k] = (ch[k] || 0) + ((T[k] || 0) - (ch[k] || 0)) * (1 - Math.exp(-dt * rate)); if (ch[k] > 0.003) ex[k] = ch[k]; }
    hb.setExpression(ex, true);
    // 眼珠：压力 > 0.38 逐渐上翻；一上一下 / 双翻 / 交替；每一抽额外抖一下
    const rr = sm(cl((s - 0.36) / 0.4, 0, 1)) * (0.65 + 0.35 * Math.min(1, Z.spasm + Z.kick)), b0 = Z.base.rl;
    const pat = Z.pat === 'both' ? [1, 1] : Z.pat === 'split' ? [1, -1] : [Z.altS, -Z.altS];
    const tr = [lerp(b0[0], pat[0] * rr, rr > 0 ? Math.min(1, rr * 1.6) : 0), lerp(b0[1], pat[1] * rr, rr > 0 ? Math.min(1, rr * 1.6) : 0)];
    for (let i = 0; i < 2; i++) Z.roll[i] += (tr[i] + Math.sin(now * 33 + i * 2) * 0.1 * Z.kick - Z.roll[i]) * (1 - Math.exp(-dt * 7));
    hb.setRoll(cl(Z.roll[0], -1, 1), cl(Z.roll[1], -1, 1));
    // 舌头：压力高时慢慢垂出，抽搐时抖
    const tt = Z.base.tg * 0.04 + sm(cl((s - 0.5) / 0.35, 0, 1)) * (Z.mode === 'n' ? 0.05 : 0.032) * (0.7 + 0.3 * Z.spasm); Z.tg += (tt - Z.tg) * (1 - Math.exp(-dt * 3.2));
    Z.tw += dt * (6 + 22 * Z.spasm); hb.setTongue(Z.tg, Z.tw, 0.3 + 0.7 * (Z.mode === 'm' ? 1 : 0.4));
  }
  function uiStep(dt) {
    const r = Z.round, rgs = root.querySelectorAll('.rg'), tgE = q('.tg');
    q('.rd').innerHTML = `第 <b>${Math.min(Z.ri + 1, Z.C.R)}</b> / ${Z.C.R} 抽`; q('.lives').textContent = '🩸'.repeat(Math.max(0, Z.lives)) + '▫'.repeat(Math.max(0, Z.C.lives - Z.lives));
    q('.cb').textContent = Z.combo > 1 ? `连击 ×${Z.combo}` : ''; q('.pl').textContent = `🔮 +${Math.round(Z.pool)}`;
    const vg = q('.vgn'); Z.vg = (Z.vg || 0) * Math.exp(-dt * 0.5); vg.style.opacity = (0.25 * Z.stress + 0.5 * Z.vg + 0.35 * Z.kick).toFixed(3);
    let show = 0;
    if (r && !r.done && Z.t >= r.t0 && (r.type === 'tap' || r.type === 'double' || r.type === 'triple')) {
      tgE.classList.add('on');
      r.tg.forEach((tg, i) => { const el = rgs[i]; if (!el) return; if (i < r.hi) { el.style.opacity = 0; return; } const span = i === 0 ? r.T : Math.max(0.3, r.gap * 1.4), k = cl((tg - Z.t) / span, -0.1, 1), sc = 1 + k * 2.6; el.style.opacity = Math.min(1, 1.2 - k * 0.5).toFixed(2); el.style.transform = `scale(${sc.toFixed(3)})`; el.style.borderColor = k < 0.12 ? '#fff' : Z.col; show++; });
      for (let i = r.tg.length; i < 3; i++) rgs[i].style.opacity = 0;
    } else { rgs.forEach(e => e.style.opacity = 0); tgE.classList.toggle('on', !!(r && !r.done && (r.type === 'hold' || r.type === 'mash'))); }
    tgE.firstChild.textContent = '空格';
  }

  // ---------------- 每帧：木棒 / 手 / 粒子（头已摆好之后）----------------
  const _wr = new THREE.Vector3(), _el = new THREE.Vector3(), _dv = new THREE.Vector3(), _a = new THREE.Vector3(), _d = new THREE.Vector3(), _tip = new THREE.Vector3(), _iq = new THREE.Quaternion(), _Y = new THREE.Vector3(0, 1, 0), _Z = new THREE.Vector3(0, 0, -1), _g = new THREE.Vector3();
  function post(K) {
    if (!Z) return; const { cam, h, rig, k } = K, hb = h.hb, g = hb.group; Z.o.rigR = rig.R; g.updateMatrixWorld(true); cam.updateMatrixWorld(true);
    const ws = Math.abs(g.getWorldScale(_s).x) || 1.55; if (!Z.club || Math.abs(Z.ws - ws) > ws * 0.04) { if (Z.club && Z.club.parent) Z.club.parent.remove(Z.club); Z.club = buildClub(ws); cam.add(Z.club); Z.ws = ws; }
    ensureFx(cam);
    const eyeY = hb.meta.eye && hb.meta.eye[1] != null ? hb.meta.eye[1] : -0.012, front = hb.meta.front != null ? hb.meta.front : 0.083;
    let anch, axis; if (Z.mode === 'm') { anch = new THREE.Vector3(0, eyeY - 0.0655, front - 0.002); axis = new THREE.Vector3(0, -0.06, -1).normalize(); }
    else { const c = hb.meta.cut || {}; anch = new THREE.Vector3(c.x || 0, hb.meta.bottom, c.z != null ? c.z : -0.03); axis = new THREE.Vector3(0, 1, 0.12).normalize(); }
    _a.copy(anch).applyMatrix4(g.matrixWorld); _d.copy(axis).transformDirection(g.matrixWorld);
    _tip.copy(_a).addScaledVector(_d, Z.depth * ws); _iq.copy(cam.quaternion).invert();
    cam.worldToLocal(_tip); _d.applyQuaternion(_iq).normalize(); Z.club.position.copy(_tip); Z.club.quaternion.setFromUnitVectors(_Y, _g.copy(_d).negate()); Z.club.visible = true;
    // 右手握在棒柄上：指尖朝向木棒方向，前臂顺着棒身往回
    const gp = _g.copy(_tip).addScaledVector(_d, -0.2 * ws); gp.y -= 0.01 * ws; Z.grip = Z.grip || new THREE.Vector3(); Z.grip.copy(gp);
    rig.R.position.set(gp.x / k, gp.y / k, gp.z / k); rig.R.quaternion.setFromUnitVectors(_Z, _d);
    { // 自己画前臂：从腕往画面右下角伸出去（原来的手臂顶着棒身往镜头里戳，透视下粗得像水管）
      const hs = rig.R.children; if (hs[1]) hs[1].visible = false; if (hs[2]) hs[2].visible = false;
      if (!Z.arm) { Z.arm = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.05, 1, 14), new THREE.MeshStandardMaterial({ color: '#5a7a3a', roughness: 0.75 })); Z.arm.frustumCulled = false; Z.arm.renderOrder = 2; cam.add(Z.arm); Z.cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.056, 0.07, 14), new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.8 })); Z.cuff.frustumCulled = false; Z.arm.add(Z.cuff); }
      const wr = _wr.copy(gp).addScaledVector(_d, -0.05 * k), el = _el.set(0.5, -0.55, 0.12).multiplyScalar(k).add(wr), dv = _dv.copy(el).sub(wr), len = dv.length();
      Z.arm.scale.set(k, len, k); Z.arm.position.copy(wr).addScaledVector(dv, 0.5); Z.arm.quaternion.setFromUnitVectors(_Y, dv.normalize()); Z.cuff.position.set(0, -0.5 + 0.06 / len, 0); Z.cuff.scale.set(1, 1 / len, 1);
    }
    // 魂烟来源：嘴（口汲）/ 断面（颈汲）与眼睛
    const mw = _a.clone(); cam.worldToLocal(mw); const eyeW = new THREE.Vector3(0, eyeY, front - 0.01).applyMatrix4(g.matrixWorld); cam.worldToLocal(eyeW); Z.src = [mw, eyeW];
    updFx(K.dt || 0.016);
  }

  // ---------------- 卡片信息（F 界面左侧）----------------
  function cardHTML(rec) {
    if (!on() || !rec || !rec.c) return ''; const c = rec.c, C = cfg(c), ck = can(rec), col = COL[c.rar | 0];
    const diff = '★'.repeat(C.stars) + '☆'.repeat(5 - C.stars);
    if (c.sip) return `<div class="sipc" style="margin-top:10px;padding:8px 10px;border-left:3px solid ${col};background:#ffffff0a"><div style="font-size:12px;letter-spacing:.2em;color:${col}">🪵 汲魂 · 已榨干</div><div style="font-size:12.5px;color:#c9b59c;margin-top:3px">当时拿到 <b style="color:#ffe28a">${c.sip.n || 0}</b> 🔮（${c.sip.k === 'done' ? '榨尽' : c.sip.k === 'fail' ? '木棒卡死' : '半途抽出'}）。她的魂只剩一层壳。</div></div>`;
    return `<div class="sipc" style="margin-top:10px;padding:8px 10px;border-left:3px solid ${col};background:#ffffff0a"><div style="font-size:12px;letter-spacing:.2em;color:${col}">🪵 汲魂 · ${esc(EFN[c.rar | 0])}</div>
      <div style="font-size:12.5px;color:#d9ccb8;margin-top:3px;line-height:1.6">${ck.ok ? `一次性：用粗木棒抽出她的残魂，换魂晶。只用<b>空格</b>踩节拍，越后面越快越窄。<br>难度 <b style="color:${col}">${diff}</b> · ${C.R} 抽 · ${C.lives} 条命 · 满分约 <b style="color:#ffe28a">${C.max}</b> 🔮<br><span style="color:#a89886">失误掉命；命尽＝魂晶炸出，只拿已累积的 55%。${C.r >= 2 ? '高阶魂额外：想起她的心愿' + (C.r >= 3 ? '、魂尘' : '') + '。' : ''}</span>` : `<span style="color:#a89886">🔒 ${esc(ck.why)}</span>`}</div></div>`;
  }
  return { on, can, cfg, begin, end, abort, press, release, pose, post, cardHTML, close, get active() { return !!Z; }, get phase() { return Z ? Z.phase : ''; }, get info() { return Z; } };
})();
