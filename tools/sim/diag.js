const {Worlds}=require('./sim.js');
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const sizes={s:[13,18],m:[22,28],l:[34,42]};const styles=Object.keys(Worlds.STYLES).filter(k=>!/^home|village/.test(k));
const N=+process.env.N||60,S0=+process.env.S||1,THR=+process.env.THR||2.5; const agg={};
for(let k=0;k<N;k++){
  const r=mulberry(S0*1000003+k*7919), style=styles[Math.floor(r()*styles.length)], sz=['s','m','l'][Math.floor(r()*3)], R=sizes[sz][0]+r()*(sizes[sz][1]-sizes[sz][0]);
  const seed=(r()*4294967296)>>>0, nd=1+Math.floor(r()*4);
  const mk=()=>({i:0,style,size:sz,R,seed,adj:Array.from({length:nd},(_,i)=>i+1),prey:[],chests:[{items:[]},{items:[]}],home:false,name:'t',region:'x',loc:{k:'x'},depth:1});
  const n1=mk(); location.search=''; const B=Worlds._debug.buildNode(n1);
  const n0=mk(); location.search='?wt=0'; const B0=Worlds._debug.buildNode(n0); location.search='';
  const RM=B.RM||B.R, cs=1; let worst=0,wx=0,wz=0; let worst0=0;
  for(let z=-RM;z<=RM;z+=cs)for(let x=-RM;x<=RM;x+=cs){ const e=B.edge?B.edge(x,z)[0]:B.R-Math.hypot(x,z); if(e<0.4)continue; const s=Math.max(Math.abs(B.H(x+cs,z)-B.H(x,z)),Math.abs(B.H(x,z+cs)-B.H(x,z)))/cs; if(s>worst){worst=s;wx=x;wz=z;} const s0=Math.max(Math.abs(B0.H(x+cs,z)-B0.H(x,z)),Math.abs(B0.H(x,z+cs)-B0.H(x,z)))/cs; if(s0>worst0)worst0=s0; }
  if(worst>THR){ const key=(n1._wt||[]).join('+'); console.log(style,sz,seed,'R',R.toFixed(3),'nd',nd,'lay',B.lay,'worst',worst.toFixed(2),'at',wx,wz,'noWT',worst0.toFixed(2),'wt:',key,'|',B.tag.slice(0,90)); }
}
