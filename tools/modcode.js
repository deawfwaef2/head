// R52：解 MOD 配置码（游戏 O 面板顶部“配置码”，玩家复制后发给 agent）。
// 用法：node tools/modcode.js MOD1-xxxx-yyy-....      不带参数 = 列出当前默认配置的配置码
// 只记录与“编码时默认值”不同的 MOD；sameDefaults=false 表示编码时的默认集与当前 mods.js 不同（可翻 git 历史找对应版本）。
const fs = require('fs'), path = require('path'), vm = require('vm');
const store = {};
const ctx = { console, localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } }, addEventListener() { }, document: { getElementById: () => null, head: { appendChild() { } }, createElement: () => ({ style: {} }) }, location: { search: '' } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'mods.js'), 'utf8'), ctx);
const M = ctx.Mods, arg = process.argv[2];
if (!arg) { console.log('默认配置码：', M.code()); process.exit(0); }
const d = M.decode(arg);
if (!d) { console.log('格式不对（应为 MOD1-校验-默认签名-内容）'); process.exit(1); }
const by = {}; for (const m of M.LIST) by[m.id] = m;
console.log(`校验：${d.ok ? '通过' : '不通过（可能抄错）'}；默认集：${d.sameDefaults ? '与当前版本相同' : '与当前版本不同'}`);
for (const [id, v] of d.set) { const m = by[id]; console.log(`${v ? '开' : '关'}  ${id}  ${m.n}  （默认${m.def ? '开' : '关'}）`); }
if (d.unknown.length) console.log('未知（当前版本没有这些 MOD）：', d.unknown.join(', '));
if (!d.set.length) console.log('与默认完全相同');
