// R46 地形自检：在 node 里加载真实的 worlds.js / wgen.js / wlayout.js / wterrain.js，对大量种子调用 buildNode，校验地形与边界。
const fs=require('fs'),path=require('path');const ROOT=''+(process.env.ROOT||'/var/work/head')+'';
global.window=global;global.self=global;global.location={search:process.env.Q||''};
const noop=()=>{};const mkp=()=>{const f=function(){return p};const p=new Proxy(f,{get:(t,k)=>k==='measureText'?()=>({width:10}):k===Symbol.toPrimitive?()=>0:(k in t?t[k]:p),set:(t,k,v)=>{t[k]=v;return true},apply:()=>p});return p};const ctx2d=mkp();
global.document={createElement:()=>({getContext:()=>ctx2d,style:{},width:0,height:0,addEventListener:noop,appendChild:noop,setAttribute:noop}),body:{appendChild:noop},head:{appendChild:noop},getElementById:()=>null,addEventListener:noop};
global.navigator={userAgent:'node'};global.localStorage={getItem:()=>null,setItem:noop};
global.requestAnimationFrame=noop;global.addEventListener=noop;global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
const T=require(ROOT+'/lib/three.min.js');global.THREE=T;
global.Image=function(){};
function load(f){ new Function(fs.readFileSync(path.join(ROOT,f),'utf8')+'\n;')(); }
function loadExp(f,name){ const src=fs.readFileSync(path.join(ROOT,f),'utf8'); new Function(src+`\n;window.${name}=window.${name}||(typeof ${name}!=='undefined'?${name}:undefined);`)(); }
for(const [f,n] of [['js/wlayout.js','WLayout'],['js/wgen.js','WGen'],['js/wterrain.js','WTerrain']]) { try{ loadExp(f,n); }catch(e){ console.log('load fail',f,e.message); } }
const wsrc=fs.readFileSync(ROOT+'/js/worlds.js','utf8');
new Function(wsrc+'\n;window.Worlds=Worlds;')();
module.exports={Worlds:window.Worlds,T};
if(require.main===module){ const n={i:0,style:'meadow',size:'m',R:25,seed:12345,adj:[1,2,3],prey:[],chests:[],home:false,name:'t',region:'x',loc:{k:'x'},depth:1}; try{const B=Worlds._debug.buildNode(n);console.log('built',Object.keys(B).join(','),B.R,B.RM,B.tag);}catch(e){console.log('ERR',e.stack.split('\n').slice(0,6).join('\n'));} }
