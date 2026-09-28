// 通灵台：观看首级“生前的记忆”MV —— 独立渲染器 + 活着的面孔（眨眼/口型/表情）+ 八音盒 + 反转
window.Seance = (() => {
  const $ = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  // 性格 → 她会说的话 + 表情
  const TR = {
    '高傲': ['区区凡人，也配和我说话？', { angry: 0.3, relaxed: 0.4 }], '温柔': ['受伤了吗？来，我帮你包扎。', { relaxed: 0.7, happy: 0.3 }],
    '冷酷': ['……别挡路。', { angry: 0.25 }], '天真': ['诶？天上的星星，是可以吃的吗？', { surprised: 0.4, happy: 0.5 }],
    '狡黠': ['嘻嘻，这次又是我赢了哦～', { happy: 0.7, blinkleft: 1 }], '暴躁': ['吵死了！再吵我就揍你！', { angry: 0.9 }],
    '胆小': ['呜……不、不要过来……', { sad: 0.7 }], '虔诚': ['愿神明庇佑这片土地。', { relaxed: 0.5, blink: 0.7 }],
    '贪婪': ['金币！闪闪发光的金币！全部都是我的！', { happy: 1 }], '忠诚': ['无论发生什么，我都会守在这里。', { relaxed: 0.35 }],
    '孤僻': ['……一个人，也挺好的。', { sad: 0.35 }], '开朗': ['早上好呀！今天也要元气满满哦！', { happy: 1 }],
    '毒舌': ['哈？你是笨蛋吗？', { angry: 0.4, happy: 0.2 }], '固执': ['我说不要就是不要！', { angry: 0.6 }],
    '多疑': ['你……到底有什么目的？', { angry: 0.3, blinkright: 0.35 }], '浪漫': ['总有一天，会有骑士骑着白马来接我吧？', { happy: 0.5, blink: 0.4 }],
    '懒散': ['呼啊……再让我睡五分钟嘛……', { relaxed: 0.8, blink: 0.6 }], '勇敢': ['躲到我身后！我来保护大家！', { angry: 0.45, happy: 0.2 }],
    '残忍': ['哭吧，再哭大声一点。', { happy: 0.5, angry: 0.2 }], '慈悲': ['无论是谁，都值得被原谅。', { relaxed: 0.8 }],
    '好奇': ['那是什么？我可以摸摸看吗？', { surprised: 0.5, happy: 0.4 }], '野心勃勃': ['王座？迟早是我的。', { happy: 0.4, angry: 0.3 }],
    '优柔寡断': ['选、选哪个好呢……两个都想要……', { sad: 0.3, surprised: 0.2 }], '自恋': ['镜子镜子，谁是世界上最美的人？——当然是我啦！', { happy: 0.8 }],
    '沉默寡言': ['…………嗯。', {}], '爱哭': ['呜哇——！我的蛋糕掉地上了——！', { sad: 1 }],
    '好战': ['来吧！让我看看你有几斤几两！', { angry: 0.6, happy: 0.4 }], '腹黑': ['啊啦，你说什么？我可是很善良的哦～', { happy: 0.8, blinkleft: 1 }],
    '迷糊': ['诶嘿嘿，我又迷路了……', { happy: 0.6, surprised: 0.3 }], '严谨': ['计划表上写着，现在是午餐时间。', { relaxed: 0.1 }],
    '叛逆': ['规矩？那种东西就是用来打破的！', { happy: 0.5, angry: 0.3 }], '嫉妒心强': ['为什么大家都只看着她……', { angry: 0.4, sad: 0.4 }],
    '乐观': ['没关系没关系，明天一定会更好的！', { happy: 0.9 }], '悲观': ['反正……最后都会变糟的吧。', { sad: 0.6 }],
    '神经质': ['刚才……是不是有什么声音？', { surprised: 0.6 }], '洁癖': ['别碰我！你的手洗过了吗？！', { angry: 0.5, surprised: 0.3 }],
    '贪吃': ['这个也想吃，那个也想吃～', { happy: 0.9 }], '话痨': ['然后啊然后啊，我跟你说哦——', { happy: 0.7 }],
    '傲娇': ['才、才不是特意等你的！笨蛋！', { angry: 0.5, happy: 0.3 }], '偏执': ['你是我的……只能是我的。', { happy: 0.5, relaxed: 0.3 }],
    '多情': ['今晚的月色真美呢。', { relaxed: 0.6, happy: 0.4 }], '冷静': ['不要慌。先观察，再行动。', { relaxed: 0.2 }],
    '骄纵': ['本小姐想要的东西，从来没有得不到的！', { happy: 0.6, angry: 0.2 }], '坚韧': ['就算跌倒一百次，我也会站起来一百零一次。', { angry: 0.2, happy: 0.3 }],
    '善变': ['嗯……还是算了！不对，还是要！', { surprised: 0.4, happy: 0.5 }]
  };
  const CHILD = {
    human: ['小时候的{gn}，总是光着脚在{loc}的田埂上追蝴蝶。', '{gn}七岁生日那天，妈妈烤了一个歪歪扭扭的苹果派。'],
    elf: ['{gn}在世界树的根须间长大，第一次学会的咒语是让花开。', '一百岁之前，{gn}一直以为月亮是会唱歌的。'],
    halfelf: ['森林里的孩子说她是人类，村里的孩子说她是精灵。{gn}只好和自己的影子玩。'],
    darkelf: ['地底没有太阳。小{gn}用荧光蘑菇给自己编了一顶王冠。'],
    beast: ['小{gn}的尾巴总是出卖她——开心的时候，怎么藏也藏不住。'],
    demon: ['{gn}的小角刚长出来的时候，痒得她整整哭了三天。'],
    angel: ['{gn}刚学飞的时候，一头撞进了云里，羽毛沾满了雨水。'],
    dragon: ['{gn}出生时的第一声啼哭喷出了一小团火苗，烧掉了接生婆的眉毛。'],
    vampire: ['{gn}从没见过日出。小时候，她以为太阳是一只很凶的猫。']
  };
  const FX = { human: 'petal', elf: 'leaf', halfelf: 'leaf', darkelf: 'firefly', beast: 'leaf', demon: 'ember', angel: 'feather', dragon: 'ember', vampire: 'rose' };
  const EXK = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'blink', 'blinkleft', 'blinkright', 'aa', 'ih', 'ou', 'ee', 'oh'];

  let el = null, R = null, scene = null, cam = null, pivot = null, hb = null, st = null, raf = 0, fxc = null, fx2 = null, parts = [], lights = {};
  const rng = s => () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;

  function script(rec) {
    const c = rec.c, gn = c.name.split('·')[0], I = (Lore.ID || {})[c.id] || {}, act = I.act || ['发呆'], tr = (c.traits || [])[0] || '温柔';
    const loc = Lore.LOCS.find(l => l.k === c.loc) || Lore.LOCS[0], r = rng(rec.id * 7919 + 13);
    const fill = s => s.replace(/\{gn\}/g, gn).replace(/\{loc\}/g, loc.n);
    const ch = CHILD[c.race] || CHILD.human, T = TR[tr] || ['……', {}];
    const fx = FX[c.race] || 'petal';
    return [
      { k: 'title', dur: 4.6, bg: [loc.color, '#140c1c'], fx: 'spark', ex: { relaxed: 0.25, happy: 0.15 }, eyesOpen: true, title: (c.title ? '『' + c.title + '』' : '') + '<b>' + c.name + '</b>', sub: `${c.raceN} · ${c.idN} · ${c.age}岁 —— 生前的记忆`, yaw: 0, zoom: 1.05 },
      { k: 'child', dur: 5.2, bg: ['#ffe2b0', '#d88a6a'], fx, ex: { happy: 0.85 }, cap: fill(ch[Math.floor(r() * ch.length)]), yaw: 0.25, tilt: 0.1 },
      { k: 'daily', dur: 5.2, bg: [loc.color, '#28384e'], fx, ex: { relaxed: 0.45 }, cap: `长大后的${gn}，每天都${act[0]}。`, cap2: `偶尔，也会${act[1] || act[0]}。`, yaw: -0.3 },
      { k: 'trait', dur: 5.4, bg: ['#ffd0e0', '#7a5aa0'], fx: 'spark', ex: T[1], talk: true, quote: T[0], cap: `大家都说，${gn}是个${tr}的姑娘。`, yaw: 0.1, tilt: -0.12, zoom: 1.12 },
      { k: 'belief', dur: 4.8, bg: ['#4a3a80', '#0e0c22'], fx: 'star', ex: { relaxed: 0.3, blink: 0.55 }, talk: true, quote: `以${c.belief}之名……`, cap: '她在心里这样发过誓。', yaw: -0.15, pitch: -0.08 },
      { k: 'dream', dur: 5.6, bg: ['#ffe0f2', '#86ccff'], fx: 'spark', ex: { happy: 1 }, talk: true, quote: `总有一天，我一定要${c.goal}！`, yaw: 0, pitch: -0.14, zoom: 1.15, bright: true },
      { k: 'morning', dur: 5.2, bg: ['#fff0c8', '#b0d4ff'], fx, ex: { relaxed: 0.8, happy: 0.2 }, cap: `那天早上，${gn}像往常一样${act[0]}。`, cap2: '天气很好。', yaw: 0.18, windDown: true },
      { k: 'twist', dur: 6.8, bg: ['#1a0004', '#000000'], fx: null, dead: true, cap: '……然后，', cap2: '她遇见了你。', yaw: 0, zoom: 0.95 }
    ];
  }

  // ---------------- 八音盒 ----------------
  function musicBox() {
    const ac = SFX.ctx, out = SFX.out; if (!ac || !out) return null;
    const g = ac.createGain(); g.gain.value = 0; g.connect(out); g.gain.linearRampToValueAtTime(0.55, ac.currentTime + 1.2);
    const dl = ac.createDelay(1); dl.delayTime.value = 0.29; const fb = ac.createGain(); fb.gain.value = 0.33; const lp = ac.createBiquadFilter(); lp.frequency.value = 2200;
    g.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); const wet = ac.createGain(); wet.gain.value = 0.5; lp.connect(wet); wet.connect(out);
    const CH = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]], PAT = [0, 1, 2, 3, 2, 1, 2, 1], PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    let step = 0, next = ac.currentTime + 0.15, tempo = 1, alive = true;
    const bell = (f, t, v, dec = 1.5) => { const o = ac.createOscillator(), o2 = ac.createOscillator(), e = ac.createGain(), e2 = ac.createGain(); o.frequency.value = f; o2.frequency.value = f * 3.01; o.connect(e); o2.connect(e2); e.connect(g); e2.connect(g);
      e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(v, t + 0.006); e.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      e2.gain.setValueAtTime(0.0001, t); e2.gain.exponentialRampToValueAtTime(v * 0.18, t + 0.004); e2.gain.exponentialRampToValueAtTime(0.0001, t + dec * 0.4);
      o.start(t); o2.start(t); o.stop(t + dec + 0.05); o2.stop(t + dec + 0.05); };
    const tick = setInterval(() => {
      if (!alive) return;
      while (next < ac.currentTime + 0.25) {
        const bar = Math.floor(step / 8) % 4, k = step % 8, ch = CH[bar], det = Math.pow(tempo, 0.35);
        bell(hz(ch[PAT[k]] + 12) * det, next, 0.07);
        if (k === 0) { const b = ac.createOscillator(), e = ac.createGain(); b.type = 'triangle'; b.frequency.value = hz(ch[0] - 12) * det; b.connect(e); e.connect(g); e.gain.setValueAtTime(0.0001, next); e.gain.exponentialRampToValueAtTime(0.09, next + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, next + 2.2); b.start(next); b.stop(next + 2.3); }
        if (k === 0 || k === 4 || (k === 6 && step % 16 > 8)) bell(hz(ch[0] + 24 + PENTA[(step * 7 + bar * 3) % PENTA.length]) * det, next + 0.01, 0.05, 2.2);
        next += 0.3 / tempo; step++;
      }
    }, 60);
    return {
      set tempo(v) { tempo = Math.max(0.25, v); },
      stop(fast) { alive = false; clearInterval(tick); const t = ac.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + (fast ? 0.06 : 1.2)); setTimeout(() => { try { g.disconnect(); wet.disconnect(); } catch (e) { } }, 3000); },
      drone() { // 反转：不协和低音
        const t = ac.currentTime, lp2 = ac.createBiquadFilter(); lp2.frequency.value = 260; const e = ac.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(0.12, t + 2.5); lp2.connect(e); e.connect(out);
        const os = [hz(33), hz(34), hz(45)].map(f => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp2); o.start(t); return o; });
        return () => { const t2 = ac.currentTime; e.gain.cancelScheduledValues(t2); e.gain.setValueAtTime(e.gain.value, t2); e.gain.linearRampToValueAtTime(0, t2 + 1); os.forEach(o => o.stop(t2 + 1.1)); };
      }
    };
  }

  // ---------------- DOM / 渲染器 ----------------
  function build() {
    el = $('div'); el.id = 'seance';
    el.innerHTML = `<div class="sc-stage"><div class="sc-bg a"></div><div class="sc-bg b"></div><div class="sc-halo"></div><canvas class="sc-fx"></canvas><canvas class="sc-3d"></canvas><div class="sc-fade"></div><canvas class="sc-fx2"></canvas></div>
      <div class="sc-red"></div><div class="sc-bar top"></div><div class="sc-bar bot"></div>
      <div class="sc-title"></div><div class="sc-quote"></div><div class="sc-cap"></div><div class="sc-choice"></div>
      <div class="sc-prog"></div><div class="sc-skip">点击 / 空格：下一幕 · Esc：跳过</div>`;
    document.body.appendChild(el);
    fxc = el.querySelector('.sc-fx').getContext('2d'); fx2 = el.querySelector('.sc-fx2').getContext('2d');
    R = new THREE.WebGLRenderer({ canvas: el.querySelector('.sc-3d'), alpha: true, antialias: true });
    R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.1; R.setClearColor(0x000000, 0);
    scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(26, 1, 0.05, 20);
    lights.hemi = new THREE.HemisphereLight('#ffffff', '#443355', 0.9); scene.add(lights.hemi);
    lights.key = new THREE.DirectionalLight('#fff2e0', 1.25); lights.key.position.set(0.6, 0.8, 1.2); scene.add(lights.key);
    lights.rim = new THREE.DirectionalLight('#c8a0ff', 1.4); lights.rim.position.set(-0.8, 0.5, -1); scene.add(lights.rim);
    pivot = new THREE.Group(); scene.add(pivot);
    el.addEventListener('click', e => { if (e.target.closest('.sc-choice')) return; advance(); });
    addEventListener('resize', resize);
  }
  function resize() {
    if (!el || !R) return; const w = innerWidth, h = innerHeight;
    R.setPixelRatio(Math.min(devicePixelRatio, 1.5)); R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    for (const c of [fxc.canvas, fx2.canvas]) { c.width = w; c.height = h; }
  }
  function onKey(e) {
    if (!st) return; e.stopImmediatePropagation(); e.preventDefault();
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight' || e.code === 'KeyE') advance();
    if (e.code === 'Escape') { if (st.phase === 'play' && st.i < st.scenes.length - 1) enter(st.scenes.length - 1); else if (st.phase === 'choice' && st.rec.seance) close(); }
  }
  function advance() { if (!st || st.phase !== 'play') return; if (st.type && st.type.i < st.type.txt.length) { st.type.i = st.type.txt.length; return; } if (st.i < st.scenes.length - 1) enter(st.i + 1); else showChoice(); }

  function typeInto(node, txt, speed) { st.type = { node, txt, i: 0, acc: 0, speed }; node.textContent = ''; }
  function enter(i) {
    st.i = i; st.st = 0; const sc = st.scenes[i];
    // 背景交叉淡入
    const a = el.querySelector('.sc-bg.a'), b = el.querySelector('.sc-bg.b'), on = st.flip ? a : b, off = st.flip ? b : a; st.flip = !st.flip;
    on.style.background = `radial-gradient(ellipse at 50% 38%, ${sc.bg[0]} 0%, ${sc.bg[1]} 78%)`; on.style.opacity = 1; off.style.opacity = 0;
    el.querySelector('.sc-fade').style.background = `linear-gradient(to top, ${sc.bg[1]} 0%, ${sc.bg[1]} 20%, transparent 46%)`;
    lights.rim.color.set(sc.bg[0]); lights.hemi.color.set(sc.bright ? '#fff8f0' : '#ffffff');
    const T = el.querySelector('.sc-title'), Q = el.querySelector('.sc-quote'), C = el.querySelector('.sc-cap');
    T.classList.toggle('in', !!sc.title); T.innerHTML = sc.title ? `<div class="t1">${sc.title}</div><div class="t2">${sc.sub || ''}</div>` : '';
    Q.classList.remove('in'); C.classList.remove('in'); C.classList.toggle('big', !!sc.dead);
    st.type = null; st.cap2 = sc.cap2 || null; st.cap2At = null;
    setTimeout(() => { if (!st || st.i !== i) return;
      if (sc.quote) { Q.classList.add('in'); typeInto(Q, '「' + sc.quote + '」', 16); C.textContent = sc.cap || ''; if (sc.cap) C.classList.add('in'); }
      else if (sc.cap) { C.classList.add('in'); typeInto(C, sc.cap, sc.dead ? 5 : 20); }
    }, sc.dead ? 1400 : 450);
    el.querySelector('.sc-prog').innerHTML = st.scenes.map((s, k) => `<i class="${k < i ? 'd' : k === i ? 'c' : ''}"></i>`).join('');
    st.fxType = sc.fx;
    if (sc.dead) die();
    else if (i > 0 && SFX.play) SFX.play('page', 0.25, 1.2);
  }
  function die() {
    el.classList.add('dead'); st.dead = 0.0001;
    if (st.music) st.music.stop(true);
    SFX.heartbeat && SFX.heartbeat(); setTimeout(() => st && SFX.heartbeat && SFX.heartbeat(), 1100);
    if (st.music) st.stopDrone = st.music.drone();
    for (const p of parts) { p.vy = Math.abs(p.vy) + 30; p.gray = 1; }
  }
  function showChoice() {
    st.phase = 'choice'; const rec = st.rec, c = rec.c, ch = el.querySelector('.sc-choice');
    const y = G.yieldOf(rec), muse = (c.aff && c.aff.includes('muse') ? 2 : 1) * (G.daily && G.daily.k === 'seance' ? 3 : 1);
    const first = Math.round(60 * y * muse), sq = Math.round(240 * y * muse);
    el.querySelector('.sc-skip').style.display = 'none';
    if (rec.seance) {
      ch.innerHTML = `<div class="sc-q">${rec.calm ? '🕊️ 她已经安息了。' : '🩸 她的怨念早已被你榨干。'}记忆只是记忆。</div><div class="sc-btns"><button class="sc-b close">合上记忆</button></div>`;
    } else {
      ch.innerHTML = `<div class="sc-q">她的魂魄还残留在这颗头里。你要怎么做？</div>
        <div class="sc-first">🔮 首次通灵 +${first} 魂晶${muse > 1 ? '（🎤歌姬 ×2）' : ''}</div>
        <div class="sc-btns"><button class="sc-b calm"><b>🕊️ 安抚亡魂</b><span>她会露出安详的表情<br>永久：产出 ×1.5</span></button>
        <button class="sc-b squeeze"><b>🩸 榨取怨念</b><span>她将永远痛苦<br>立刻：+${sq} 魂晶${c.aff && c.aff.includes('wrath') ? '' : '，获得魂印【怨灵】'}</span></button></div>`;
    }
    ch.classList.add('in');
    const done = (txt, col) => { ch.innerHTML = `<div class="sc-res" style="color:${col}">${txt}</div><div class="sc-btns"><button class="sc-b close">继续</button></div>`; ch.querySelector('.close').onclick = e => { e.stopPropagation(); close(); }; };
    ch.querySelectorAll('.sc-b').forEach(b => b.onclick = e => {
      e.stopPropagation(); if (b.classList.contains('close')) { close(); return; }
      rec.seance = 1; if (!c.aff) c.aff = [];
      if (b.classList.contains('calm')) {
        rec.calm = 1; rec.look.ex = { relaxed: 1, blink: 1, happy: 0.15 }; G.addCoins(first);
        setEx(rec.look.ex, true); el.classList.add('calmed'); SFX.play && SFX.play('bell', 0.6, 1.2); SFX.fanfare && SFX.fanfare(2);
        st.cb.onApply && st.cb.onApply(rec.look.ex, 'calm');
        done(`🕊️ ${c.name.split('·')[0]} 的表情终于安详了。<br><small>+${first} 魂晶 · 产出永久 ×1.5</small>`, '#cfe8ff');
      } else {
        const add = !c.aff.includes('wrath'); if (add) c.aff.push('wrath');
        rec.look.ex = { angry: 0.7, sad: 0.8, surprised: 0.45 }; G.addCoins(first + sq);
        setEx(rec.look.ex, true); el.classList.add('squeezed'); SFX.roar && SFX.roar(); SFX.coins && SFX.coins();
        st.cb.onApply && st.cb.onApply(rec.look.ex, 'squeeze');
        done(`🩸 怨念化作魂晶倾泻而出！<br><small>+${first + sq} 魂晶${add ? ' · 获得魂印【😈怨灵】' : ''}</small>`, '#ff6a6a');
      }
    });
  }
  function setEx(ex, hard) { st.exT = Object.assign({}, ex); st.frozen = true; if (hard) for (const k of EXK) st.ex[k] = st.exT[k] || 0; }

  // ---------------- 粒子 ----------------
  function spawn(type, W, H) {
    const p = { type, x: Math.random() * W, y: -20, vx: (Math.random() - 0.5) * 30, vy: 30 + Math.random() * 40, r: 3 + Math.random() * 5, a: Math.random() * 6.28, va: (Math.random() - 0.5) * 3, life: 0, max: 8 + Math.random() * 4, front: Math.random() < 0.25 };
    if (type === 'ember' || type === 'firefly') { p.y = H + 20; p.vy = -(25 + Math.random() * 45); p.r = 1.5 + Math.random() * 2.5; }
    if (type === 'spark' || type === 'star') { p.y = Math.random() * H; p.vy = type === 'star' ? 0 : -8; p.vx *= 0.2; p.r = 1 + Math.random() * 2.5; p.max = 2 + Math.random() * 2; }
    return p;
  }
  const PCOL = { petal: '#ffb8d0', leaf: '#8fdc7a', ember: '#ffae4a', feather: '#ffffff', rose: '#e0203a', firefly: '#d8ff7a', spark: '#ffffff', star: '#fff4c0' };
  function drawParts(dt) {
    const W = fxc.canvas.width, H = fxc.canvas.height; fxc.clearRect(0, 0, W, H); fx2.clearRect(0, 0, W, H);
    if (st.fxType && !st.dead && parts.length < 70 && Math.random() < dt * 22) parts.push(spawn(st.fxType, W, H));
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life += dt; p.x += (p.vx + Math.sin(p.life * 1.3 + p.a) * 18) * dt; p.y += p.vy * dt; p.a += p.va * dt;
      if (p.life > p.max || p.y > H + 40 || p.y < -60) { parts.splice(i, 1); continue; }
      const g = p.front ? fx2 : fxc, fade = Math.min(1, p.life * 2, (p.max - p.life) * 1.5);
      g.save(); g.globalAlpha = fade * (p.gray ? 0.5 : 0.9); g.translate(p.x, p.y); g.rotate(p.a);
      const col = p.gray ? '#777' : PCOL[p.type] || '#fff';
      if (p.type === 'ember' || p.type === 'firefly' || p.type === 'spark' || p.type === 'star') {
        const tw = p.type === 'spark' || p.type === 'star' ? 0.5 + 0.5 * Math.sin(p.life * 7 + p.a) : 1;
        g.globalCompositeOperation = 'lighter'; const rg = g.createRadialGradient(0, 0, 0, 0, 0, p.r * 4); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.globalAlpha *= tw; g.beginPath(); g.arc(0, 0, p.r * 4, 0, 6.28); g.fill();
        if (p.type === 'spark') { g.fillStyle = '#fff'; g.fillRect(-p.r * 3, -0.6, p.r * 6, 1.2); g.fillRect(-0.6, -p.r * 3, 1.2, p.r * 6); }
      } else {
        g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, p.r * (p.type === 'feather' ? 0.6 : 1), p.r * (p.type === 'feather' ? 2.2 : 0.55), 0, 0, 6.28); g.fill();
      }
      g.restore();
    }
  }

  // ---------------- 主循环 ----------------
  function loop(ts) {
    if (!st) return; raf = requestAnimationFrame(loop);
    const now = ts / 1000, dt = Math.min(0.05, now - (st.last || now)); st.last = now; st.t += dt; st.st += dt;
    const sc = st.scenes[st.i];
    if (st.phase === 'play' && st.st >= sc.dur && !(st.type && st.type.i < st.type.txt.length)) { if (st.i < st.scenes.length - 1) enter(st.i + 1); else showChoice(); }
    // 打字
    let talking = false;
    if (st.type && st.type.i < st.type.txt.length) {
      st.type.acc += dt * st.type.speed; const n = Math.floor(st.type.acc); if (n > 0) { st.type.acc -= n; st.type.i = Math.min(st.type.txt.length, st.type.i + n); st.type.node.textContent = st.type.txt.slice(0, st.type.i); }
      talking = !!sc.talk && st.type.node.classList.contains('sc-quote');
    } else if (st.cap2 && st.phase === 'play') {
      if (st.cap2At == null) st.cap2At = st.st + (sc.dead ? 1.1 : 0.7);
      if (st.st >= st.cap2At) { const C = el.querySelector('.sc-cap'); const base = C.textContent; st.cap2 = null; typeInto(C, base + (sc.dead ? '' : ' ') + (sc.cap2 || ''), sc.dead ? 5 : 20); st.type.i = base.length; st.type.node.textContent = base; }
    }
    // 八音盒发条变慢
    if (st.music && sc.windDown) st.music.tempo = 1 - Math.max(0, (st.st - 2) / (sc.dur - 2)) * 0.6;
    // 表情
    if (!st.frozen) {
      st.exT = Object.assign({}, sc.dead ? {} : sc.ex);
      if (st.i === 0 && st.st < 1.2) st.exT.blink = 1 - st.st / 1.2; // 睁眼
      if (!sc.dead) { st.blinkIn -= dt; if (st.blinkIn < 0) { st.blinkIn = 2 + Math.random() * 3; st.blinkAt = st.t; } const bk = st.t - st.blinkAt; if (bk < 0.16) st.exT.blink = Math.max(st.exT.blink || 0, 1 - Math.abs(bk - 0.08) / 0.08); }
      if (talking) { st.mouthIn -= dt; if (st.mouthIn < 0) { st.mouthIn = 0.07 + Math.random() * 0.06; st.vowel = ['aa', 'oh', 'ih', 'ou', 'ee', 'aa'][Math.floor(Math.random() * 6)]; st.vAmt = 0.4 + Math.random() * 0.6; } st.exT[st.vowel] = (st.exT[st.vowel] || 0) + st.vAmt; }
    }
    if (sc.dead && st.dead && !st.frozen) {
      st.dead += dt; const k = Math.min(1, st.dead / 2.2), L = st.rec.look;
      if (st.dead < 0.9) { st.exT = { surprised: 0.5 }; }
      else { st.exT = Object.assign({}, L.ex || {}); if (hb.hl.length && hb.hl[0].visible) { hb.hl.forEach(m => m.visible = false); SFX.play && SFX.play('bell', 0.35, 0.5); } }
      hb.U.dull.value = (L.glowEye ? 0.08 : 0.45) * k; hb.U.blood.value = (L.blood || 0) * k; hb.U.spat.value = (L.spat || 0) * k; hb.U.pale.value = (L.pale || 0) * k;
    }
    const sp = 1 - Math.exp(-dt * (talking ? 22 : 6));
    for (const k of EXK) st.ex[k] += ((st.exT[k] || 0) - st.ex[k]) * sp;
    hb.setExpression(st.ex);
    // 头部运动
    const t = st.t, dk = sc.dead ? Math.min(1, st.st / 2.5) * (el.classList.contains('calmed') ? 0.25 : 1) : 0;
    const ty = (sc.yaw || 0) + Math.sin(t * 0.55) * 0.12 * (1 - dk), tp = (sc.pitch || 0) + Math.sin(t * 0.8) * 0.035 * (1 - dk) + dk * 0.14, tz = (sc.tilt || 0) + (talking ? Math.sin(t * 5) * 0.03 : 0) + dk * 0.16;
    const s2 = 1 - Math.exp(-dt * 2.5);
    pivot.rotation.y += (ty - pivot.rotation.y) * s2; pivot.rotation.x += (tp - pivot.rotation.x) * s2; pivot.rotation.z += (tz - pivot.rotation.z) * s2;
    pivot.position.y = Math.sin(t * 1.1) * 0.006 * (1 - dk) - dk * 0.02;
    hb.setSway(new THREE.Vector3(Math.sin(t * 0.9) * 0.4, 0, Math.cos(t * 0.7) * 0.25).multiplyScalar(1 - dk));
    const z = (sc.zoom || 1) + st.st * 0.012; st.zoom += (z - st.zoom) * s2;
    st.camY += ((sc.dead ? 0.022 : 0.004) - st.camY) * s2; cam.position.set(0, st.camY + 0.008, st.dist / st.zoom); cam.lookAt(0, st.camY, 0);
    ModelHeads.tick(now);
    drawParts(dt);
    R.render(scene, cam);
  }

  function open(rec, cb = {}) {
    if (st) return;
    if (!el) build();
    resize(); el.className = ''; el.style.display = 'block';
    requestAnimationFrame(() => el.classList.add('on'));
    const look = Object.assign({}, rec.look);
    hb = ModelHeads.create(look, { alive: true });
    hb.U.dull.value = 0; hb.U.blood.value = 0; hb.U.spat.value = 0; hb.U.pale.value = 0;
    const box = new THREE.Box3().setFromObject(hb.group), ctr = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    hb.group.position.copy(ctr).multiplyScalar(-1); hb.group.position.y += size.y * 0.06; pivot.add(hb.group); pivot.rotation.set(0, 0, 0);
    const dist = Math.max(size.y, size.x) * 1.75 / Math.tan(THREE.MathUtils.degToRad(13));
    st = { rec, cb, scenes: script(rec), i: 0, st: 0, t: 0, ex: {}, exT: {}, blinkIn: 2.5, blinkAt: -9, mouthIn: 0, vowel: 'aa', vAmt: 0, phase: 'play', dist: dist * 0.5, zoom: 0.9, flip: false, dead: 0, camY: 0.004 };
    for (const k of EXK) st.ex[k] = 0; st.ex.blink = 1;
    parts = []; el.querySelector('.sc-choice').classList.remove('in'); el.querySelector('.sc-choice').innerHTML = ''; el.querySelector('.sc-skip').style.display = '';
    SFX.duck && SFX.duck(true); st.music = musicBox();
    addEventListener('keydown', onKey, true);
    enter(0); raf = requestAnimationFrame(loop);
  }
  function close() {
    if (!st) return; const cb = st.cb;
    if (st.music) st.music.stop(false); if (st.stopDrone) st.stopDrone();
    removeEventListener('keydown', onKey, true);
    cancelAnimationFrame(raf); el.classList.remove('on');
    const h = hb; st = null;
    setTimeout(() => { if (h) { pivot.remove(h.group); h.dispose(); } if (!st) el.style.display = 'none'; }, 450);
    SFX.duck && SFX.duck(false);
    cb.onClose && cb.onClose();
  }
  return { open, close, get active() { return !!st; }, _st: () => st };
})();
