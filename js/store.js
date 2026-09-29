// 魂库存档层（第九轮 · 9999 首级）
// localStorage 只有约 5M 字符；每条首级记录 ~1.1KB，9999 颗 ≈ 11M 字符，原样存不下。
// 方案：入库（rec.vault = true）的记录按 id 分块（每块 256 条），LZW 压缩成 UTF-16 字符串，存到独立键
// soulhead_vault_<k>。每次 save() 只重压“签名变化”的块（签名 = 条数 + id 和 + 版本号），
// 所以平时的高频存档依旧很快；主存档里不再包含入库记录。
(function () {
  const PREFIX = 'soulhead_vault_', CH = 256, NMAX = 60000;
  // 码值 → 字符：跳过 0 和代理区 D800–DFFF，保证 localStorage 往返无损
  const toC = v => String.fromCharCode(v + 1 < 0xD800 ? v + 1 : v + 1 + 0x800);
  const toV = ch => { const c = ch.charCodeAt(0); return (c >= 0xE000 ? c - 0x800 : c) - 1; };
  // 压缩：字典只收 ≥2 字符的串；单字符以「0 + 原字符」字面量输出；满了就清空重来（编解码对称）
  function enc(s) {
    s = s.replace(/[\ud800-\udfff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
    if (!s.length) return '';
    const dict = new Map(), out = []; let next = 1, w = s[0];
    const emit = w => { if (w.length === 1) out.push(toC(0), w); else out.push(toC(dict.get(w))); };
    for (let i = 1; i < s.length; i++) {
      const c = s[i], wc = w + c;
      if (dict.has(wc)) { w = wc; continue; }
      emit(w);
      if (next < NMAX) dict.set(wc, next++); else { dict.clear(); next = 1; }
      w = c;
    }
    emit(w);
    return out.join('');
  }
  function dec(z) {
    if (!z) return '';
    const rev = [null], out = []; let next = 1, prev = null, i = 0;
    while (i < z.length) {
      const k = toV(z[i++]); let e;
      if (k === 0) e = z[i++];
      else if (k < rev.length && rev[k] !== undefined && k < next) e = rev[k];
      else if (k === next && prev) e = prev + prev[0];
      else throw new Error('vault decode: bad code ' + k);
      if (prev !== null) { if (next < NMAX) rev[next++] = prev + e[0]; else { rev.length = 1; next = 1; } }
      out.push(e); prev = e;
    }
    return out.join('');
  }
  const sigs = {}; // 已落盘块的签名
  const chunkOf = r => Math.floor(r.id / CH);
  const sigOf = list => list.length + ':' + list.reduce((a, r) => a + r.id, 0) + ':' + list.reduce((a, r) => a + (r.vv || 0), 0);
  function keys() { const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX)) ks.push(k); } return ks; }
  // 载入：把各块解压后并入 S.heads（去重：主存档里若有同 id 以主存档为准）
  function loadVault(S) {
    let n = 0; const have = new Set(S.heads.map(r => r.id));
    for (const k of keys()) {
      try {
        const raw = localStorage.getItem(k), list = JSON.parse(raw.startsWith('Z1') ? dec(raw.slice(2)) : raw);
        sigs[k.slice(PREFIX.length)] = sigOf(list);
        for (const r of list) { if (have.has(r.id)) continue; r.vault = true; r.inBag = false; S.heads.push(r); have.add(r.id); n++; }
      } catch (e) { console.warn('vault chunk load failed', k, e); }
    }
    return n;
  }
  // 保存：返回主存档应写入的 heads（不含入库记录）
  function saveVault(S) {
    const by = {}; const main = [];
    for (const r of S.heads) { if (r.vault) (by[chunkOf(r)] = by[chunkOf(r)] || []).push(r); else main.push(r); }
    for (const c in by) {
      const sg = sigOf(by[c]); if (sigs[c] === sg) continue;
      try { localStorage.setItem(PREFIX + c, 'Z1' + enc(JSON.stringify(by[c], (k, v) => (k === 'vault' || k === 'p' || k === 'q' || k === 'mt' || k === 'ms' || k === 'isNew') ? undefined : v))); sigs[c] = sg; }
      catch (e) { console.warn('vault save failed', e); if (window.G && G.toast) G.toast('⚠ 魂库存档空间不足', '#f88'); }
    }
    for (const c in sigs) if (!by[c]) { localStorage.removeItem(PREFIX + c); delete sigs[c]; }
    return main;
  }
  function wipeVault() { for (const k of keys()) localStorage.removeItem(k); for (const c in sigs) delete sigs[c]; }
  function usage() { let n = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || '').length; } return n; }
  window.Store = { enc, dec, loadVault, saveVault, wipeVault, usage, CH };
})();
