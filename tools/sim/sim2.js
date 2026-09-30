const {Worlds,T}=require('./sim.js');const N=+process.env.N||200, S0=+process.env.S||1;
const styles=Object.keys(Worlds.STYLES).filter(k=>!/^home|village/.test(k));
const sizes={s:[13,18],m:[22,28],l:[34,42]};
const SL=+process.env.SL||0.95; // walkable slope per metre (≈43°)
const fails={},stat={n:0,t:0,cov:[],maxSlope:[],cliffFrac:[]}; const bad=(k,info)=>{(fails[k]=fails[k]||[]).push(info)};
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const shapeStat={};
for(let k=0;k<N;k++){
  const r=mulberry(S0*1000003+k*7919), style=styles[Math.floor(r()*styles.length)], sz=['s','m','l'][Math.floor(r()*3)], R=sizes[sz][0]+r()*(sizes[sz][1]-sizes[sz][0]);
  const seed=(r()*4294967296)>>>0, nd=1+Math.floor(r()*4);
  const node={i:0,style,size:sz,R,seed,adj:Array.from({length:nd},(_,i)=>i+1),prey:[],chests:[{items:[]},{items:[]}],home:false,name:'t',region:'x',loc:{k:'x'},depth:1};
  let B; const t0=Date.now(); try{ B=Worlds._debug.buildNode(node); }catch(e){ bad('crash',{style,sz,seed,msg:e.message.slice(0,120),st:e.stack.split('\n')[1]}); continue; }
  stat.n++; stat.t+=Date.now()-t0;
  const tag=`${style}/${sz}/s${seed}/R${R.toFixed(3)}/nd${nd}`, LP=B.lp, H=B.H, RM=B.RM||B.R, kind=LP&&LP.kind||'none';
  const inside=(x,z)=> B.edge? B.edge(x,z)[0]>0.4 : Math.hypot(x,z)<B.R-0.4;
  const cs=1.0, n=Math.ceil(2*RM/cs)+1, h=new Float32Array(n*n), ok=new Uint8Array(n*n); let nan=0, ins=0, maxS=0, cliff=0;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){ const x=-RM+i*cs,z=-RM+j*cs; const y=H(x,z); h[j*n+i]=y; if(!Number.isFinite(y)||Math.abs(y)>60)nan++; if(inside(x,z))ok[j*n+i]=1; }
  if(nan)bad('nan/huge',{tag,nan});
  const sl=(a,b,d)=>Math.abs(h[a]-h[b])/d;
  let walk=new Uint8Array(n*n);
  for(let j=1;j<n-1;j++)for(let i=1;i<n-1;i++){ const c=j*n+i; if(!ok[c])continue; ins++; const s=Math.max(sl(c,c+1,cs),sl(c,c-1,cs),sl(c,c+n,cs),sl(c,c-n,cs)); maxS=Math.max(maxS,s); if(s>1.4)cliff++; }
  // flood fill from each door inward
  const idx=(x,z)=>Math.round((z+RM)/cs)*n+Math.round((x+RM)/cs);
  const doors=B.doors; const seedC=[]; for(const d of doors){ const ux=-Math.cos(d.a), uz=-Math.sin(d.a); seedC.push([d.x+ux*2,d.z+uz*2,d]); }
  const comp=new Int32Array(n*n).fill(-1); let nc=0, dist=new Int32Array(n*n);
  const fill=(c0,id)=>{ const q=[c0]; comp[c0]=id; let cnt=0; while(q.length){ const c=q.pop(); cnt++; const i=c%n,j=(c/n)|0; for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){ const ii=i+di,jj=j+dj; if(ii<0||jj<0||ii>=n||jj>=n)continue; const e=jj*n+ii; if(comp[e]>=0||!ok[e])continue; if(sl(c,e,cs)>SL)continue; comp[e]=id; q.push(e);} } return cnt; };
  const sizes2=[]; for(const [x,z,d] of seedC){ let c=idx(x,z); if(!ok[c]){ bad('doorseed-outside',{tag,kind}); continue;} if(comp[c]<0){ sizes2.push(fill(c,nc++)); } }
  if(nc>1){ // all doors should share one component
    const ids=new Set(seedC.map(([x,z])=>comp[idx(x,z)])); if(ids.size>1) bad('doors-disconnected',{tag,kind,tags:B.tag.slice(0,60),comps:[...ids].length,nd:doors.length}); }
  // centre reachability
  const cc=idx(0,0); if(comp[cc]<0 || comp[cc]!==comp[idx(seedC[0][0],seedC[0][1])]) bad('centre-unreachable',{tag,kind,tag2:B.tag.slice(0,60)});
  let reach=0; const mainId=comp[idx(seedC[0][0],seedC[0][1])]; for(let c=0;c<n*n;c++) if(ok[c]&&comp[c]===mainId)reach++; const cov=reach/ins; stat.cov.push(cov); if(cov<0.75)bad('low-coverage',{tag,kind,cov:+cov.toFixed(2),tag2:B.tag.slice(0,70)});
  // door flatness & water
  const g=B.style.g; for(const d of doors){ let mn=1e9,mx=-1e9; for(let a=0;a<8;a++)for(const rr of [1,2.5]){ const px=d.x+Math.cos(a*0.785)*rr,pz=d.z+Math.sin(a*0.785)*rr; if(B.edge&&B.edge(px,pz)[0]<0.3)continue; const y=H(px,pz); mn=Math.min(mn,y);mx=Math.max(mx,y);} if(mx-mn>1.3)bad('door-not-flat',{tag,kind,dy:+(mx-mn).toFixed(2)}); if(g&&g.wd&&g.wd(d.x,d.z).d<0.5)bad('door-in-water',{tag}); const e=B.edge?B.edge(d.x,d.z)[0]:B.R-Math.hypot(d.x,d.z); if(e<0||e>4)bad('door-off-edge',{tag,kind,e:+e.toFixed(1)}); }
  for(let a=0;a<doors.length;a++)for(let b=a+1;b<doors.length;b++) if(Math.hypot(doors[a].x-doors[b].x,doors[a].z-doors[b].z)<9)bad('doors-close',{tag,kind,d:+Math.hypot(doors[a].x-doors[b].x,doors[a].z-doors[b].z).toFixed(1)});
  // interactive objects & cols inside boundary, not steep, not in water
  for(const it of B.inter){ if(it.x==null)continue; if(!inside(it.x,it.z)){ bad('inter-outside',{tag,kind,k:it.kind}); continue;} if(g&&g.wd&&g.wd(it.x,it.z).d<0)bad('inter-in-water',{tag,k:it.kind}); const c=idx(it.x,it.z); if(ok[c]&&comp[c]!==mainId)bad('inter-unreachable',{tag,kind,k:it.kind}); }
  let outc=0; for(const c of B.cols){ if(!inside(c.x,c.z)&&(B.edge?B.edge(c.x,c.z)[0]<-3:Math.hypot(c.x,c.z)>B.R+3))outc++; } if(outc>B.cols.length*0.25)bad('cols-far-outside',{tag,kind,outc,all:B.cols.length});
  const sp=B.spots||[]; for(const s0 of sp){ const s={x:s0.x,z:s0.z}; if(B.edge){const E=B.edge(s.x,s.z); if(E[0]<2){s.x+=E[1]*(2-E[0]);s.z+=E[2]*(2-E[0]);}} if(!inside(s.x,s.z))bad('spot-outside',{tag,kind}); }
  stat.maxSlope.push(maxS); stat.cliffFrac.push(cliff/ins);
  const ss=shapeStat[kind]=shapeStat[kind]||{n:0,cov:0,cliff:0,ms:0,RM:0}; ss.n++;ss.cov+=cov;ss.cliff+=cliff/ins;ss.ms+=maxS;ss.RM+=RM;
}
const q=(a,p)=>{a=[...a].sort((x,y)=>x-y);return +a[Math.floor(a.length*p)].toFixed(2)};
console.log('built',stat.n,'avg ms',(stat.t/stat.n).toFixed(0),'cov p10/p50',q(stat.cov,.1),q(stat.cov,.5),'maxSlope p50/p90/p99',q(stat.maxSlope,.5),q(stat.maxSlope,.9),q(stat.maxSlope,.99),'cliff% p50/p90',q(stat.cliffFrac,.5),q(stat.cliffFrac,.9));
for(const k in shapeStat){const s=shapeStat[k];console.log(' ',k.padEnd(6),'n',s.n,'cov',(s.cov/s.n).toFixed(2),'cliff',(s.cliff/s.n*100).toFixed(1)+'%','maxS',(s.ms/s.n).toFixed(2),'RM',(s.RM/s.n).toFixed(0));}
for(const k in fails){ console.log('FAIL',k,fails[k].length,JSON.stringify(fails[k].slice(0,3))); }
if(!Object.keys(fails).length)console.log('no failures');
