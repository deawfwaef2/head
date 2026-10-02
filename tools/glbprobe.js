// 探测 GLB：节点树 + 动画列表（node tools/glbprobe.js file.glb [clipName]）
const fs = require('fs');
const b = fs.readFileSync(process.argv[2]); let off = 12, J = null;
while (off < b.length) { const len = b.readUInt32LE(off), ty = b.readUInt32LE(off + 4); if (ty === 0x4E4F534A) J = JSON.parse(b.slice(off + 8, off + 8 + len).toString('utf8')); off += 8 + len; }
const N = J.nodes, parent = {}; N.forEach((n, i) => (n.children || []).forEach(c => parent[c] = i));
const roots = N.map((_, i) => i).filter(i => !(i in parent));
const pr = (i, d) => { const n = N[i]; console.log(' '.repeat(d * 2) + (n.name || i) + (n.scale ? ' S' + n.scale.map(x => +x.toFixed(2)) : '') + (n.mesh != null ? ' [mesh]' : '') + (n.skin != null ? ' [skin]' : '')); (n.children || []).forEach(c => pr(c, d + 1)); };
roots.forEach(r => pr(r, 0));
console.log('anims', J.animations.map(a => a.name).join(', '));
const a0 = J.animations[0]; console.log('interp', [...new Set(J.animations.flatMap(a => a.samplers.map(s => s.interpolation || 'LINEAR')))].join(','), 'chan paths', [...new Set(J.animations.flatMap(a => a.channels.map(c => c.target.path)))].join(','));
