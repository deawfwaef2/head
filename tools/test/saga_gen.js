// R49 saga 生成器自检：node tools/test/saga_gen.js  （检查槽位全部填满、多样性、线索推进）
const fs = require('fs'), path = require('path'); const R = p => path.join(__dirname, '..', '..', p);
global.window = global; global.document = { createElement: () => ({ style: {} }), body: { children: [], appendChild() {} }, head: { appendChild() {} }, addEventListener() {} };
global.addEventListener = () => {}; global.setInterval = () => 0; global.localStorage = { getItem: () => 'zh' };
const ID = {}; ['huntress','smithgirl','herbalist','shepherd','barmaid','ranger','druid','archer','singer','moonpriest','wolfwarrior','foxmiko','shaman','chieftess','falconer','catthief','inquisitor','paladin','choir','nun','saint','abbess','novice','hexer','countess','witch','bogwitch','covenlady','alchemist','merc','crossbow','knight','medic','engineer','general','dragonknight','assassin','guard','courtmage','musician','lady','princess','queen','shadow','fallen','succubus','duchess','abyssqueen','dragonslayer','dragonmiko','avatar','archangel','dragonprincess','villager','elfprincess','bard'].forEach(k => ID[k] = { n: k });
global.Lore = { ID, LOCS: ['village','forest','wilds','abbey','swamp','fortress','capital','abyss','peak'].map(k => ({ k, n: '地' + k, rec: 100, color: '#fff', icon: '' })) };
const S = { stats: { kills: 50 }, bosses: {}, heads: [] }; global.G = { S, save() {}, st: () => ({ maxHp: 100 }), camera: { children: [] } };
eval(fs.readFileSync(R('js/saga_data.js'), 'utf8').replace('window.SagaData', 'global.SagaData'));
eval(fs.readFileSync(R('js/saga.js'), 'utf8').replace('window.Saga =', 'global.Saga ='));
const N = +process.env.N || 3000, seen = new Set(), arch = {}, bad = []; let envoys = 0, chaps = 0, maxLen = 0;
const ks = Lore.LOCS.map(l => l.k);
for (let i = 0; i < N; i++) {
  const k = ks[i % 9]; Saga.SS().v[k] = 1 + (i % 7); if (Math.random() < .3) Saga.SS().cl.length = Math.floor(Math.random() * 7);
  const sg = Saga.gen(k); const b = Saga.script(sg);
  if (sg.envoy) envoys++; if (sg.chap) chaps++; arch[sg.arch.id] = (arch[sg.arch.id] || 0) + 1;
  for (const beat of b) { for (const l of beat.lines) { if (/[{}]/.test(l.t)) bad.push(l.t); seen.add(l.t); maxLen = Math.max(maxLen, l.t.length); } if (beat.stake) { for (const t of [beat.stake.good, beat.stake.bad]) { if (/[{}]/.test(t)) bad.push(t); seen.add(t); } } }
  const tot = b.reduce((a, x) => a + x.dur, 0); if (tot > 60 || tot < 15) bad.push('dur ' + tot);
}
console.log('runs', N, 'unique lines', seen.size, 'envoy', envoys, 'chap', chaps, 'maxLen', maxLen); console.log(arch); console.log('bad', bad.length, bad.slice(0, 5));
const sg = Saga.gen('swamp'); const bs = Saga.script(sg); console.log('sample:', sg.arch.nm, sg.T.title, sg.T.n, Math.round(bs.reduce((a, x) => a + x.dur, 0)) + 's'); bs.forEach(b => console.log(' [' + b.shot + '] ' + b.lines.map(l => (l.w ? l.w + '：' : '') + l.t).join(' / ') + (b.stake ? ' || 好:' + b.stake.good + ' 坏:' + b.stake.bad : '')));
{ const D0 = SagaData; const a = []; for (let i = 0; i < 800; i++) { const k = ks[i % 9]; Saga.SS().v[k] = 1 + (i % 7); if (i % 2) Saga.SS().chap = {}; else D0.CHAP.forEach(c => Saga.SS().chap[c.id] = 1); const sg = Saga.gen(k); const b = Saga.script(sg); a.push([sg.chap ? 1 : 0, sg.vis >= 4 ? 1 : 0, b.reduce((x, y) => x + y.dur, 0)]); }
  const st = f => { const v = a.filter(f).map(x => x[2]).sort((p, q) => p - q); return v.length ? `n${v.length} p10 ${v[v.length * .1 | 0].toFixed(0)} p50 ${v[v.length >> 1].toFixed(0)} p90 ${v[v.length * .9 | 0].toFixed(0)}` : '-'; };
  console.log('long nochap', st(x => !x[0] && !x[1]), '| long chap', st(x => x[0] && !x[1]), '| short nochap', st(x => !x[0] && x[1]), '| short chap', st(x => x[0] && x[1])); }
