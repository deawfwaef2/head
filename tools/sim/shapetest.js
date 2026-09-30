const fs=require('fs');global.window=global;global.location={search:''};global.THREE={Vector3:function(){}};
new Function(fs.readFileSync('/var/work/head/js/wlayout.js','utf8')+';window.WLayout=WLayout;')();
const kinds=['round','long','lobes','arms','poly','ell','bent','snake'];
const nzf=()=>0.5;
function mk(seed,R,shape){window.__wlShape=shape;return WLayout.plan({seed,R,size:'m',style:'meadow'},nzf);}
let bad=0;const stat={};
for(const k of kinds){ let mnR=1e9,mxR=0,asp=[],amin=1e9,amax=0,tips=[];
 for(let s=1;s<=300;s++){ const R=[15,25,38][s%3]; const P=mk(s*7919,R,k);
  const t=P.tab; let mn=1e9,mx=0; for(let i=0;i<t.length;i++){ if(!(t[i]>0)||t[i]!==t[i]){bad++;console.log("nan",k,s)} mn=Math.min(mn,t[i]);mx=Math.max(mx,t[i]);}
  // aspect: max extent / min extent via opposite
  let ex=0,ey=1e9; for(let i=0;i<360;i++){ const w=t[i]+t[i+360]; ex=Math.max(ex,w); ey=Math.min(ey,w);} asp.push(ex/ey);
  mnR=Math.min(mnR,mn/R); mxR=Math.max(mxR,mx); if(mx>66.01){bad++;console.log("mx",k,s)} if(mn<R*0.66-0.01){bad++;console.log("mn",k,s,mn,R)}
  amin=Math.min(amin,P.areaK);amax=Math.max(amax,P.areaK); tips.push(P.tips.length);
  // edge/clamp sanity
  const aa=s*0.37,pp=P.Rf(aa)+0.6; const p={x:pp*Math.cos(aa),z:pp*Math.sin(aa)}; P.clamp(p,0.4); const E=P.edge(p.x,p.z); if(E[0]<0.3){bad++;if(bad<30)console.log("clamp",k,s,E)}
  const sm=P.samp(()=>Math.random()); if(P.dOut(sm[0],sm[1])>0.01){bad++;if(bad<30)console.log("samp",k,s,P.dOut(sm[0],sm[1]))}
 }
 asp.sort((a,b)=>a-b); stat[k]={minR:mnR.toFixed(2),maxRmax:mxR.toFixed(1),aspMed:asp[150].toFixed(2),aspMax:asp[299].toFixed(2),areaK:[amin.toFixed(2),amax.toFixed(2)],tipsAvg:(tips.reduce((a,b)=>a+b)/300).toFixed(1)};
}
console.log(JSON.stringify(stat,null,1),'bad',bad);
if(process.argv[2]){ for(const k of kinds.slice(1)){ for(const seed of [3,5]){ const P=mk(seed*104729,26,k); console.log(k,seed,'Rmax',P.Rmax.toFixed(0),'tips',P.tips.map(a=>(a*57.3|0)).join(','));
 const S=64; for(let j=-S;j<=S;j+=4){ let l=''; for(let i=-S;i<=S;i+=2){ const x=i,z=j; l+=P.dOut(x,z)<0?'#':'.'; } console.log(l);} } } }
