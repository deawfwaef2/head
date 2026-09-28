// 程序化二次元头部生成器（v1 占位方案；后续可替换为授权允许的高质量模型）
window.HeadGen = (() => {
  const V3 = THREE.Vector3;
  const R = 0.15; // 头半径（米）

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  const HAIR = [
    [['#2a2220', '#4a3a36'], ['#4b2e22', '#7a5040'], ['#1d1d2a', '#3a3a55'], ['#c99a62', '#f0d39a'], ['#6b4332', '#a7715a']],
    [['#e98fb0', '#ffd0e0'], ['#7fa9e6', '#cfe3ff'], ['#bfc3d4', '#ffffff'], ['#d05050', '#ff9a8a'], ['#f2c46b', '#fff0c0']],
    [['#8e5fd6', '#d9b8ff'], ['#3fbf9c', '#b5ffe6'], ['#ff7d4f', '#ffd0a0'], ['#e8e8f4', '#bcd4ff'], ['#2c3e8f', '#7fa0ff']],
    [['#ff6fa8', '#7fd4ff'], ['#ffd36b', '#ff7a7a'], ['#a07bff', '#ff9ee8'], ['#f4f4ff', '#ffb8e6']],
    [['rainbow', 'rainbow']]
  ];
  const EYES = [['#3a6fd8', '#9fd0ff'], ['#c0392b', '#ff9f8f'], ['#2e9e5b', '#a8f0c0'], ['#8a4fd0', '#e0b8ff'], ['#d48a1c', '#ffe08a'], ['#1aa3a3', '#9ff5f0'], ['#d4508a', '#ffb8d8'], ['#5a3a2a', '#c09070']];
  const NAMES = ['樱', '凛', '葵', '雪乃', '千夏', '美月', '琴音', '白露', '小春', '爱丽', '瑠璃', '朝日', '真白', '栞', '铃音', '夜宵', '初音', '奏', '若叶', '柚子', '纱雾', '雏', '星奈', '悠', '蓝', '茜', '绫', '澪', '千岁', '空'];
  const EXPR = [
    { n: '半闭眼·微张嘴', eye: 'half', mouth: 'slight', brow: 'neutral' },
    { n: '瞪视·紧闭嘴', eye: 'stare', mouth: 'line', brow: 'angry' },
    { n: '微笑', eye: 'open', mouth: 'smile', brow: 'neutral', blush: 1 },
    { n: '开心', eye: 'happy', mouth: 'open', brow: 'up', blush: 1 },
    { n: '困倦', eye: 'sleepy', mouth: 'o', brow: 'sad' },
    { n: '眨眼', eye: 'wink', mouth: 'cat', brow: 'up', blush: 1 },
    { n: '惊讶', eye: 'wide', mouth: 'o', brow: 'up' },
    { n: '害羞', eye: 'half', mouth: 'pout', brow: 'sad', blush: 2 },
    { n: '生气', eye: 'open', mouth: 'teeth', brow: 'angry' },
    { n: '呆滞', eye: 'dull', mouth: 'line', brow: 'neutral' },
    { n: '得意', eye: 'half', mouth: 'smirk', brow: 'up' },
    { n: '闭眼安详', eye: 'closed', mouth: 'smile', brow: 'neutral', blush: 1 }
  ];
  const REACT = { eye: 'xx', mouth: 'open', brow: 'sad', blush: 2 };

  // 方向：θ 自顶部, a 方位（0=正前 +z, 正值=+x）
  const sp = (th, a, rad) => new V3(Math.sin(th) * Math.sin(a) * rad, Math.cos(th) * rad, Math.sin(th) * Math.cos(a) * rad);

  // 头骨变形：下半部收窄成尖下巴
  function deform(geo) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      x *= 0.93;
      if (y < 0) {
        const t = Math.min(1, -y / R);
        x *= 1 - 0.34 * Math.pow(t, 1.4);
        y *= 1 + 0.12 * t;
        if (z > 0) z *= 1 - 0.1 * t * t; else z *= 1 - 0.25 * t;
      } else {
        z *= 1.02;
      }
      p.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
  }

  // 发束：沿曲线的椭圆截面管，宽度随 t 变化
  function strand(pts, wfn, th, segs = 14, rad = 7, outward) {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const pos = [], uv = [], idx = [];
    const N = new V3(), B = new V3(), T = new V3(), P = new V3();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      curve.getPoint(t, P); curve.getTangent(t, T);
      N.copy(outward ? outward(P) : P).normalize();
      N.sub(T.clone().multiplyScalar(N.dot(T))).normalize();
      B.crossVectors(T, N).normalize();
      const w = wfn(t), h = th * (1 - 0.65 * t) + 0.0006;
      for (let j = 0; j <= rad; j++) {
        const an = j / rad * Math.PI * 2;
        const c = Math.cos(an), s = Math.sin(an);
        pos.push(P.x + B.x * c * w * 0.5 + N.x * s * h * 0.5, P.y + B.y * c * w * 0.5 + N.y * s * h * 0.5, P.z + B.z * c * w * 0.5 + N.z * s * h * 0.5);
        uv.push(j / rad, t);
      }
    }
    for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) {
      const a = i * (rad + 1) + j, b = a + rad + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const taper = (w0, p = 0.8) => t => w0 * Math.pow(1 - t, p) + 0.002;
  const bulge = (w0) => t => w0 * (0.55 + 0.9 * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (1 - t * 0.5)) * (1 - Math.pow(t, 6)) + 0.002;

  function hexLerp(a, b, t) { const A = new THREE.Color(a), Bc = new THREE.Color(b); return '#' + A.lerp(Bc, t).getHexString(); }

  function hairTexture(r, c0, c1) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    const g = cv.getContext('2d');
    const bump = document.createElement('canvas'); bump.width = 256; bump.height = 256;
    const b = bump.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    if (c0 === 'rainbow') {
      ['#ff6b8b', '#ffb86b', '#fff06b', '#7bff9e', '#6bd4ff', '#b88bff'].forEach((c, i, a) => grad.addColorStop(i / (a.length - 1), c));
    } else {
      grad.addColorStop(0, hexLerp(c0, '#000000', 0.15)); grad.addColorStop(0.55, c0); grad.addColorStop(1, c1);
    }
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    b.fillStyle = '#808080'; b.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) {
      const x = r() * 256, w = 0.6 + r() * 1.8, l = r();
      g.fillStyle = l > 0.5 ? `rgba(255,255,255,${0.04 + r() * 0.08})` : `rgba(0,0,0,${0.05 + r() * 0.1})`;
      g.fillRect(x, 0, w, 256);
      b.fillStyle = l > 0.5 ? `rgba(255,255,255,${0.2 + r() * 0.3})` : `rgba(0,0,0,${0.2 + r() * 0.3})`;
      b.fillRect(x, 0, w, 256);
    }
    // 天使环高光
    const hg = g.createLinearGradient(0, 40, 0, 110);
    hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(0.5, 'rgba(255,255,255,0.28)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hg; g.fillRect(0, 40, 256, 70);
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
    const btex = new THREE.CanvasTexture(bump); btex.wrapS = btex.wrapT = THREE.RepeatWrapping;
    return { tex, btex };
  }

  // 断面贴图（程序化，带凹凸）
  let cutMat = null;
  function getCutMaterial(skin) {
    const S = 256;
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S; const g = cv.getContext('2d');
    const bc = document.createElement('canvas'); bc.width = S; bc.height = S; const b = bc.getContext('2d');
    const c = S / 2;
    g.fillStyle = skin; g.fillRect(0, 0, S, S);
    b.fillStyle = '#fff'; b.fillRect(0, 0, S, S);
    const ring = (r, col, bcol) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, r, 0, 7); g.fill(); b.fillStyle = bcol; b.beginPath(); b.arc(c, c, r, 0, 7); b.fill(); };
    ring(122, '#f3b9a6', '#e0e0e0');
    ring(114, '#f5dca0', '#c8c8c8');
    ring(104, '#b8283a', '#707070');
    // 肌理
    for (let i = 0; i < 900; i++) {
      const an = Math.random() * Math.PI * 2, rr = Math.random() * 100;
      const x = c + Math.cos(an) * rr, y = c + Math.sin(an) * rr;
      const l = Math.random();
      g.fillStyle = l > 0.5 ? `rgba(255,120,120,${0.15 + Math.random() * 0.2})` : `rgba(90,0,15,${0.15 + Math.random() * 0.25})`;
      g.beginPath(); g.ellipse(x, y, 2 + Math.random() * 5, 1 + Math.random() * 2, an + 1.57, 0, 7); g.fill();
      b.fillStyle = l > 0.5 ? 'rgba(160,160,160,0.5)' : 'rgba(40,40,40,0.5)';
      b.beginPath(); b.ellipse(x, y, 2 + Math.random() * 5, 1 + Math.random() * 2, an + 1.57, 0, 7); b.fill();
    }
    // 颈椎 & 气管
    g.fillStyle = '#efe6d6'; g.beginPath(); g.arc(c, c + 42, 24, 0, 7); g.fill();
    g.strokeStyle = '#c9b89a'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#d9cbb3'; g.beginPath(); g.arc(c, c + 42, 9, 0, 7); g.fill();
    b.fillStyle = '#f0f0f0'; b.beginPath(); b.arc(c, c + 42, 24, 0, 7); b.fill();
    g.fillStyle = '#e59aa0'; g.beginPath(); g.ellipse(c, c - 34, 18, 14, 0, 0, 7); g.fill();
    g.fillStyle = '#5a1020'; g.beginPath(); g.ellipse(c, c - 34, 11, 8, 0, 0, 7); g.fill();
    b.fillStyle = '#202020'; b.beginPath(); b.ellipse(c, c - 34, 11, 8, 0, 0, 7); b.fill();
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const btex = new THREE.CanvasTexture(bc);
    return new THREE.MeshStandardMaterial({ map: tex, bumpMap: btex, bumpScale: 0.004, roughness: 0.35, metalness: 0.0 });
  }

  // ---------------- 脸部绘制 ----------------
  // 脸部贴片：球面 phi ∈ [π/2-1, π/2+1], θ ∈ [0.85, 2.35] → 512x512
  const FW = 512, TH0 = 0.85, THL = 1.5, PHL = 2.0;
  function at(g, th, ax, fn) {
    g.save();
    const x = FW / 2 + ax * (FW / PHL) / Math.sin(th);
    const y = (th - TH0) / THL * FW;
    g.translate(x, y);
    g.scale((FW / PHL) / Math.sin(th) / 100, (FW / THL) / 100);
    fn(g);
    g.restore();
  }

  function drawEye(g, s, e, look, lash) {
    // s: +1/-1 镜像，外眼角在 +x
    g.scale(s, 1);
    const w = 14.5, h = 16.5;
    const type = e;
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (type === 'happy' || type === 'closed' || type === 'xx') {
      g.strokeStyle = lash; g.lineWidth = 3.2;
      g.beginPath();
      if (type === 'happy') { g.moveTo(-w, 4); g.quadraticCurveTo(0, -12, w, 4); }
      else if (type === 'closed') { g.moveTo(-w, -1); g.quadraticCurveTo(0, 9, w + 2, -3); g.moveTo(w - 1, 0); g.lineTo(w + 4, 3); }
      else { g.moveTo(w, -9); g.lineTo(-w * 0.6, 0); g.lineTo(w, 9); }
      g.stroke();
      return;
    }
    let lid = -h; // 眼皮位置（从上往下）
    if (type === 'half') lid = -3; else if (type === 'sleepy') lid = 4; else if (type === 'stare') lid = -h * 0.8;
    const wide = type === 'wide' ? 1.12 : 1;
    const ww = w * wide, hh = h * wide;
    g.save();
    g.beginPath(); g.ellipse(0, 0, ww, hh, 0, 0, Math.PI * 2);
    g.fillStyle = '#fdfbff'; g.fill();
    g.clip();
    // 上眼睑阴影
    const sh = g.createLinearGradient(0, -hh, 0, 0); sh.addColorStop(0, 'rgba(120,80,120,0.35)'); sh.addColorStop(1, 'rgba(120,80,120,0)');
    g.fillStyle = sh; g.fillRect(-ww, -hh, ww * 2, hh);
    const small = (type === 'stare' || type === 'dull' || type === 'wide') ? 0.7 : 1;
    const iw = 10.5 * small, ih = 14 * small;
    const ig = g.createLinearGradient(0, -ih, 0, ih);
    ig.addColorStop(0, hexLerp(look.eye[0], '#000', 0.55)); ig.addColorStop(0.45, look.eye[0]); ig.addColorStop(1, look.eye[1]);
    g.fillStyle = ig; g.beginPath(); g.ellipse(-1, 1.5, iw, ih, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = hexLerp(look.eye[0], '#000', 0.6); g.lineWidth = 1.2; g.stroke();
    if (type !== 'dull') {
      g.fillStyle = hexLerp(look.eye[0], '#000', 0.7);
      if (look.special === 'heart') {
        g.beginPath(); const hx = -1, hy = 3, k = 0.55;
        g.moveTo(hx, hy + 6 * k * 1.3); g.bezierCurveTo(hx - 10 * k, hy - 2 * k, hx - 5 * k, hy - 9 * k, hx, hy - 4 * k);
        g.bezierCurveTo(hx + 5 * k, hy - 9 * k, hx + 10 * k, hy - 2 * k, hx, hy + 6 * k * 1.3); g.fillStyle = '#ff3d8b'; g.fill();
      } else {
        g.beginPath(); g.ellipse(-1, 2.5, iw * 0.42, ih * 0.48, 0, 0, Math.PI * 2); g.fill();
      }
      // 虹膜内光
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(-1, 8, iw * 0.7, ih * 0.3, 0, 0, Math.PI * 2); g.fill();
      // 高光
      g.fillStyle = '#fff';
      if (look.special === 'star') {
        star(g, -5, -5, 4.5);
      } else { g.beginPath(); g.ellipse(-5, -5, 3.4, 4, -0.3, 0, Math.PI * 2); g.fill(); }
      g.beginPath(); g.arc(3.5, 6.5, 1.6, 0, Math.PI * 2); g.fill();
    }
    // 眼皮覆盖
    if (lid > -hh) {
      g.fillStyle = look.skin; g.fillRect(-ww - 2, -hh - 2, ww * 2 + 4, lid + hh + 2);
    }
    g.restore();
    // 睫毛
    g.strokeStyle = lash; g.fillStyle = lash;
    const chord = lid > -hh ? ww * Math.sqrt(Math.max(0, 1 - (lid / hh) ** 2)) : 0;
    g.lineWidth = 3.4;
    g.beginPath();
    if (lid > -hh) {
      g.moveTo(-chord - 1, lid + 1); g.quadraticCurveTo(0, lid - 2.5, chord + 3, lid - 1);
    } else {
      g.moveTo(-ww - 1, -2); g.bezierCurveTo(-ww * 0.6, -hh * 1.15, ww * 0.5, -hh * 1.2, ww + 3, -hh * 0.35);
    }
    g.stroke();
    // 外眼角翘起
    const ey = lid > -hh ? lid - 1 : -hh * 0.35;
    const ex = lid > -hh ? chord + 3 : ww + 3;
    g.beginPath(); g.moveTo(ex - 5, ey - 1); g.lineTo(ex + 3.5, ey - 3.5); g.lineTo(ex, ey + 2); g.fill();
    // 下睫毛
    g.lineWidth = 1.2; g.beginPath(); g.moveTo(ww * 0.1, hh * 0.98); g.quadraticCurveTo(ww * 0.7, hh * 0.85, ww * 0.95, hh * 0.45); g.stroke();
    // 双眼皮线
    if (lid <= -hh * 0.8) { g.lineWidth = 0.9; g.globalAlpha = 0.45; g.beginPath(); g.moveTo(-ww * 0.5, -hh * 1.22); g.quadraticCurveTo(ww * 0.2, -hh * 1.42, ww * 0.9, -hh * 0.95); g.stroke(); g.globalAlpha = 1; }
  }
  function star(g, x, y, r) {
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.35 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  }
  function drawBrow(g, s, b, col) {
    g.scale(s, 1);
    g.strokeStyle = col; g.lineWidth = 2.4; g.lineCap = 'round';
    let yi = 0, yo = -1, ym = -3;
    if (b === 'angry') { yi = 6; yo = -3; ym = 0; }
    if (b === 'sad') { yi = -5; yo = 3; ym = -3; }
    if (b === 'up') { yi = -4; yo = -4; ym = -8; }
    g.beginPath(); g.moveTo(-11, yi); g.quadraticCurveTo(0, ym, 13, yo); g.stroke();
  }
  function drawMouth(g, m) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    const line = '#6b3036', inner = '#8a2a36', tongue = '#f07a8a';
    g.strokeStyle = line; g.lineWidth = 1.6;
    const fillOpen = (path) => { g.beginPath(); path(); g.fillStyle = inner; g.fill(); g.save(); g.clip(); g.fillStyle = tongue; g.beginPath(); g.ellipse(0, 6, 6, 4, 0, 0, 7); g.fill(); g.restore(); g.stroke(); };
    switch (m) {
      case 'line': g.beginPath(); g.moveTo(-5, 0); g.quadraticCurveTo(0, 0.8, 5, 0); g.stroke(); break;
      case 'smile': g.beginPath(); g.moveTo(-7, -1); g.quadraticCurveTo(0, 5, 7, -1); g.stroke(); break;
      case 'slight': g.beginPath(); g.ellipse(0, 1, 3.2, 1.8, 0, 0, 7); g.fillStyle = inner; g.fill(); g.stroke(); break;
      case 'o': fillOpen(() => g.ellipse(0, 2, 4, 5, 0, 0, 7)); break;
      case 'open': fillOpen(() => { g.moveTo(-8, -1); g.quadraticCurveTo(0, 1, 8, -1); g.quadraticCurveTo(6, 11, 0, 11); g.quadraticCurveTo(-6, 11, -8, -1); }); break;
      case 'teeth': g.beginPath(); g.moveTo(-7, 0); g.lineTo(7, 0); g.quadraticCurveTo(5, 7, 0, 7); g.quadraticCurveTo(-5, 7, -7, 0); g.fillStyle = inner; g.fill();
        g.fillStyle = '#fff'; g.fillRect(-6.5, 0, 13, 2.4); g.stroke(); break;
      case 'cat': g.beginPath(); g.moveTo(-7, -1); g.quadraticCurveTo(-3.5, 4, 0, 0); g.quadraticCurveTo(3.5, 4, 7, -1); g.stroke(); break;
      case 'pout': g.beginPath(); g.moveTo(-4, 1); g.quadraticCurveTo(-2, -1.5, 0, 0.5); g.quadraticCurveTo(2, -1.5, 4, 1); g.stroke(); break;
      case 'smirk': g.beginPath(); g.moveTo(-6, 0); g.quadraticCurveTo(1, 2.5, 7, -3); g.stroke(); break;
    }
  }
  function drawFace(ctx, look, expr) {
    const g = ctx;
    g.clearRect(0, 0, FW, FW);
    // 刘海阴影
    const sh = g.createLinearGradient(0, 0, 0, FW * 0.3);
    sh.addColorStop(0, 'rgba(90,40,60,0.28)'); sh.addColorStop(1, 'rgba(90,40,60,0)');
    g.fillStyle = sh; g.fillRect(0, 0, FW, FW * 0.3);
    const lash = hexLerp(look.hairDark, '#1a0d10', 0.6);
    // 腮红
    if (expr.blush) {
      for (const s of [-1, 1]) at(g, 1.9, s * 0.43, g2 => {
        const rg = g2.createRadialGradient(0, 0, 0, 0, 0, 13);
        rg.addColorStop(0, `rgba(255,110,140,${expr.blush > 1 ? 0.55 : 0.35})`); rg.addColorStop(1, 'rgba(255,110,140,0)');
        g2.fillStyle = rg; g2.beginPath(); g2.ellipse(0, 0, 14, 8, 0, 0, 7); g2.fill();
        if (expr.blush > 1) { g2.strokeStyle = 'rgba(230,80,110,0.6)'; g2.lineWidth = 1; for (let i = -1; i <= 1; i++) { g2.beginPath(); g2.moveTo(i * 4 - 1.5, 2); g2.lineTo(i * 4 + 1.5, -2); g2.stroke(); } }
      });
    }
    // 眉
    for (const s of [-1, 1]) at(g, 1.36, s * 0.36, g2 => drawBrow(g2, s, expr.brow, hexLerp(look.hairDark, '#000', 0.2)));
    // 眼
    for (const s of [-1, 1]) {
      let e = expr.eye;
      if (e === 'wink') e = s > 0 ? 'happy' : 'open';
      at(g, 1.64, s * 0.35, g2 => drawEye(g2, s, e, look, lash));
    }
    // 鼻
    at(g, 1.9, 0, g2 => { g2.strokeStyle = 'rgba(200,120,110,0.7)'; g2.lineWidth = 1.2; g2.beginPath(); g2.moveTo(0.5, -2); g2.lineTo(-0.5, 1.5); g2.stroke(); });
    // 嘴
    at(g, 2.1, 0, g2 => drawMouth(g2, expr.mouth));
  }

  // ---------------- 组装头部 ----------------
  function build(seed, rarity) {
    const r = rng(seed);
    const rr = Math.min(rarity, HAIR.length - 1);
    const pool = [];
    for (let i = 0; i <= rr; i++) pool.push(...HAIR[i].map(h => [h, i]));
    const hsel = rarity >= 3 ? pick(r, HAIR[rarity]) : (r() < 0.6 ? pick(r, HAIR[rarity]) : pick(r, pool)[0]);
    const hc0 = hsel[0], hc1 = hsel[1];
    const hairDark = hc0 === 'rainbow' ? '#b86bd6' : hc0;
    const skin = pick(r, ['#ffe6d8', '#ffe0cf', '#fde3d6', '#ffeadf', '#f9dcc8']);
    const look = { eye: pick(r, EYES), skin, hairDark, special: rarity === 3 ? 'star' : rarity === 4 ? 'heart' : null };
    if (rarity === 4) look.eye = ['#d43b8a', '#ffb3e0'];
    const expr = pick(r, EXPR);
    const name = pick(r, NAMES);
    const style = pick(r, rarity >= 2 ? ['long', 'twintail', 'ponytail', 'bob', 'twintail'] : ['long', 'bob', 'bob', 'ponytail']);

    const grp = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.55, metalness: 0 });
    // 头骨
    const skull = new THREE.SphereGeometry(R, 48, 36); deform(skull);
    const skullM = new THREE.Mesh(skull, skinMat); skullM.castShadow = true; grp.add(skullM);
    // 脸部贴片
    const cv = document.createElement('canvas'); cv.width = FW; cv.height = FW;
    const ctx = cv.getContext('2d');
    drawFace(ctx, look, expr);
    const faceTex = new THREE.CanvasTexture(cv); faceTex.encoding = THREE.sRGBEncoding; faceTex.anisotropy = 8;
    const faceGeo = new THREE.SphereGeometry(R * 1.004, 48, 40, Math.PI / 2 - PHL / 2, PHL, TH0, THL); deform(faceGeo);
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
    const face = new THREE.Mesh(faceGeo, faceMat); face.renderOrder = 1; grp.add(face);
    // 耳
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(R * 0.16, 12, 10), skinMat);
      ear.scale.set(0.5, 1, 0.8); ear.position.set(s * R * 0.9, -R * 0.1, -R * 0.05); grp.add(ear);
    }
    // 脖子与切口
    const neckTop = -R * 0.45, neckBot = -R * 1.05, nr = R * 0.4;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(nr * 0.95, nr * 1.05, neckTop - neckBot, 28, 1, true), skinMat);
    neck.position.set(0, (neckTop + neckBot) / 2, -R * 0.12); neck.castShadow = true; grp.add(neck);
    const cutGeo = new THREE.CircleGeometry(nr * 1.05, 40, 0, Math.PI * 2);
    { // 凹凸断面
      const p = cutGeo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const d = Math.hypot(x, y) / (nr * 1.05); p.setZ(i, (1 - d * d) * R * 0.05 * (0.6 + 0.4 * Math.sin(x * 200) * Math.cos(y * 170))); }
      cutGeo.computeVertexNormals();
    }
    const cut = new THREE.Mesh(cutGeo, getCutMaterial(skin));
    cut.rotation.x = Math.PI / 2; cut.position.set(0, neckBot - 0.0005, -R * 0.12); grp.add(cut);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(nr * 1.04, R * 0.025, 8, 36), new THREE.MeshStandardMaterial({ color: '#e59a8c', roughness: 0.5 }));
    lip.rotation.x = Math.PI / 2; lip.position.copy(cut.position); grp.add(lip);

    // 头发
    const { tex, btex } = hairTexture(r, hc0, hc1);
    const hairMat = new THREE.MeshStandardMaterial({ map: tex, bumpMap: btex, bumpScale: 0.0015, roughness: 0.42, metalness: 0.05, side: THREE.DoubleSide });
    if (rarity === 4) { hairMat.emissive = new THREE.Color('#402060'); hairMat.emissiveIntensity = 0.4; }
    const addH = (geo) => { const m = new THREE.Mesh(geo, hairMat); m.castShadow = true; grp.add(m); return m; };
    // 顶部 + 后脑壳
    addH(new THREE.SphereGeometry(R * 1.07, 40, 16, 0, Math.PI * 2, 0, 0.95));
    const back = new THREE.SphereGeometry(R * 1.08, 40, 24, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0.3, 1.85);
    addH(back);
    // 刘海
    const nb = 9 + Math.floor(r() * 4);
    for (let i = 0; i < nb; i++) {
      const a = -1.0 + 2.0 * (i / (nb - 1)) + (r() - 0.5) * 0.06;
      const end = 1.22 + r() * 0.16 + (Math.abs(a) > 0.7 ? 0.2 : 0);
      const pts = [sp(0.12, a * 0.3, R * 1.02), sp(0.55, a * 0.72, R * 1.1), sp(0.95, a * 0.95, R * 1.14), sp(end - 0.12, a * 1.02, R * 1.11), sp(end, a * 1.02 - Math.sign(a) * 0.04, R * 1.06)];
      addH(strand(pts, taper(R * (0.3 + r() * 0.08), 0.9), R * 0.08));
    }
    // 鬓发
    for (const s of [-1, 1]) {
      const a = s * 1.12;
      const pts = [sp(0.5, a, R * 1.06), sp(1.2, a, R * 1.14), sp(1.75, a * 1.02, R * 1.1), new V3(s * R * 0.78, -R * 0.95, R * 0.34), new V3(s * R * 0.72, -R * (style === 'long' ? 1.35 : 1.1), R * 0.36)];
      addH(strand(pts, taper(R * 0.36, 0.7), R * 0.1));
    }
    // 后发
    const longL = style === 'long' ? R * 0.75 : style === 'bob' ? R * 0.15 : R * 0.1;
    const nbk = 14;
    for (let i = 0; i < nbk; i++) {
      const a = 1.05 + (Math.PI * 2 - 2.1) * (i / (nbk - 1));
      const p3 = sp(1.95, a, R * 1.13);
      const out = new V3(p3.x, 0, p3.z).normalize();
      const pts = [sp(0.25, a, R * 1.04), sp(0.9, a, R * 1.12), sp(1.45, a, R * 1.16), p3, p3.clone().add(new V3(0, -longL * 0.5, 0)).addScaledVector(out, R * 0.03), p3.clone().add(new V3(0, -longL, 0)).addScaledVector(out, R * 0.02)];
      addH(strand(pts, taper(R * 0.55, 0.6), R * 0.12, 16));
    }
    // 发型特征
    if (style === 'twintail' || style === 'ponytail') {
      const tails = style === 'twintail' ? [-1, 1] : [0];
      const tieMat = new THREE.MeshStandardMaterial({ color: pick(r, ['#ff4d6d', '#4d7dff', '#ffffff', '#222222', '#ffd24d']), roughness: 0.4 });
      for (const s of tails) {
        const base = s === 0 ? sp(0.85, Math.PI, R * 1.08) : sp(0.62, s * 1.55, R * 1.07);
        const outv = s === 0 ? new V3(0, 0, -1) : new V3(s, 0, 0);
        const pts = [base, base.clone().addScaledVector(outv, R * 0.35).add(new V3(0, R * 0.12, 0)), base.clone().addScaledVector(outv, R * 0.62).add(new V3(0, -R * 0.2, 0)), base.clone().addScaledVector(outv, R * 0.7).add(new V3(0, -R * 0.75, 0)), base.clone().addScaledVector(outv, R * 0.55).add(new V3(0, -R * 1.25, 0))];
        addH(strand(pts, bulge(R * 0.55), R * 0.4, 18, 10, P => new V3(outv.x, 0.3, outv.z)));
        const tie = new THREE.Mesh(new THREE.TorusGeometry(R * 0.1, R * 0.045, 8, 16), tieMat);
        tie.position.copy(base).addScaledVector(outv, R * 0.08); tie.lookAt(tie.position.clone().add(outv)); grp.add(tie);
      }
    }
    // 呆毛
    if (rarity >= 3 || r() < 0.3) {
      addH(strand([sp(0.05, 0, R * 1.05), new V3(0, R * 1.35, R * 0.05), new V3(0, R * 1.55, R * 0.25), new V3(0, R * 1.45, R * 0.42)], taper(R * 0.14), R * 0.05, 12, 6, () => new V3(1, 0, 0)));
    }
    // 饰品
    const acc = [];
    const accCol = pick(r, ['#ff4d6d', '#ff8fb8', '#4d9dff', '#ffffff', '#ffd24d', '#9b6bff']);
    const accMat = new THREE.MeshStandardMaterial({ color: accCol, roughness: 0.35, metalness: 0.1 });
    let accType = null;
    if (rarity === 0 && r() < 0.35) accType = 'clip';
    if (rarity === 1) accType = pick(r, ['clip', 'ribbon', 'ribbon']);
    if (rarity === 2) accType = pick(r, ['ribbon', 'cat', 'cat', 'fox']);
    if (rarity === 3) accType = pick(r, ['tiara', 'cat', 'tiara']);
    if (rarity === 4) accType = 'halo';
    if (accType === 'clip') {
      for (let k = 0; k < 2; k++) { const c = new THREE.Mesh(new THREE.BoxGeometry(R * 0.28, R * 0.05, R * 0.04), accMat); c.position.copy(sp(1.0, 0.72 + k * 0.08, R * 1.16)); c.rotation.set(0, 0.7, -0.6 - k * 0.2); grp.add(c); }
    }
    if (accType === 'ribbon') {
      const rb = new THREE.Group();
      for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(R * 0.18, R * 0.38, 4), accMat); w.rotation.z = s * Math.PI / 2; w.scale.set(1, 1, 0.35); w.position.x = s * R * 0.18; rb.add(w); }
      rb.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.07, 10, 8), accMat));
      const p = sp(0.55, 0.9, R * 1.15); rb.position.copy(p); rb.lookAt(p.clone().multiplyScalar(2)); grp.add(rb);
    }
    if (accType === 'cat' || accType === 'fox') {
      const earMat = hairMat, inner = new THREE.MeshStandardMaterial({ color: '#ffb3c6', roughness: 0.6 });
      for (const s of [-1, 1]) {
        const e = new THREE.Group();
        const o = new THREE.Mesh(new THREE.ConeGeometry(R * 0.3, R * (accType === 'fox' ? 0.7 : 0.5), 4), earMat); o.scale.set(1, 1, 0.45); e.add(o);
        const i2 = new THREE.Mesh(new THREE.ConeGeometry(R * 0.18, R * (accType === 'fox' ? 0.5 : 0.34), 4), inner); i2.scale.set(1, 1, 0.3); i2.position.set(0, -R * 0.03, R * 0.05); e.add(i2);
        e.position.copy(sp(0.55, s * 0.72, R * 1.08)); e.rotation.set(-0.15, 0, -s * 0.45); grp.add(e);
      }
    }
    if (accType === 'tiara') {
      const gold = new THREE.MeshStandardMaterial({ color: '#ffd36b', roughness: 0.2, metalness: 1 });
      const t = new THREE.Mesh(new THREE.TorusGeometry(R * 0.72, R * 0.035, 8, 40, Math.PI * 0.9), gold);
      t.rotation.set(-Math.PI / 2 + 0.35, 0, Math.PI * 0.05); t.position.set(0, R * 0.78, R * 0.05); grp.add(t);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(R * 0.1), new THREE.MeshStandardMaterial({ color: '#ff3d7f', roughness: 0.05, metalness: 0.3, emissive: '#5a0020' }));
      gem.position.copy(sp(0.55, 0, R * 1.16)); grp.add(gem);
    }
    if (accType === 'halo') {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(R * 0.6, R * 0.045, 10, 48), new THREE.MeshStandardMaterial({ color: '#fff4c0', emissive: '#ffd966', emissiveIntensity: 1.6, roughness: 0.3 }));
      halo.rotation.x = Math.PI / 2 - 0.25; halo.position.set(0, R * 1.55, -R * 0.1); grp.add(halo); acc.push(halo);
    }

    const baseExpr = expr;
    function setExpr(e) { drawFace(ctx, look, e || baseExpr); faceTex.needsUpdate = true; }
    function dispose() {
      grp.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); if (o.material.bumpMap) o.material.bumpMap.dispose(); o.material.dispose(); } });
    }
    return { group: grp, setExpr, react: () => setExpr(REACT), name, exprName: expr.n, style, acc, dispose };
  }

  return { build, R };
})();
