const {Worlds}=require('./sim.js');const fs=require('fs');
const kinds=(process.env.K||'long,lobes,arms,poly,ell,bent,snake,round').split(','), PER=+process.env.PER||3, S0=+process.env.S||11;
const styles=['meadow','forest','wilds','ruins','swamp','fortress','abyss','peak'];
const cells=[]; const W=260, cs=0.6;
let idx=0;
for(const k of kinds)for(let j=0;j<PER;j++){ window.__wlShape=k; idx++;
  const style=styles[(idx*3+S0)%styles.length], sz=['s','m','l'][(idx+j)%3], R=({s:15,m:25,l:38})[sz]+ (idx%5);
  const n={i:0,style,size:sz,R,seed:(S0*7919+idx*104729)>>>0,adj:[1,2,3].slice(0,1+(idx%3)),prey:[],chests:[],home:false,name:'t',region:'x',loc:{k:'x'},depth:1};
  const B=Worlds._debug.buildNode(n); const RM=B.RM+6, N=Math.round(2*RM/cs); const img=new Uint8Array(N*N*3); 
  const hh=new Float32Array((N+2)*(N+2)); for(let j2=0;j2<N+2;j2++)for(let i=0;i<N+2;i++)hh[j2*(N+2)+i]=B.H(-RM+(i-1)*cs,-RM+(j2-1)*cs);
  for(let j2=0;j2<N;j2++)for(let i=0;i<N;i++){ const x=-RM+i*cs,z=-RM+j2*cs,c=(j2+1)*(N+2)+i+1,h=hh[c]; const dx=(hh[c+1]-hh[c-1])/(2*cs),dz=(hh[c+N+2]-hh[c-N-2])/(2*cs); let sh=0.72+0.5*(-dx*0.6-dz*0.5)/Math.sqrt(1+dx*dx+dz*dz); const e=B.edge?B.edge(x,z)[0]:B.R-Math.hypot(x,z); const slope=Math.hypot(dx,dz);
    let r,g,b; if(e>0){ const t=Math.max(0,Math.min(1,(h+2)/7)); r=90+90*t;g=130+60*t;b=80+70*t; if(slope>0.95){r=200;g=90;b=70;} } else { r=40;g=42;b=52; const t=Math.max(0,Math.min(1,(h+2)/14)); r+=60*t;g+=55*t;b+=50*t; }
    if(Math.abs(e)<0.35){r=255;g=230;b=120;}
    const o=(j2*N+i)*3; img[o]=Math.min(255,r*sh);img[o+1]=Math.min(255,g*sh);img[o+2]=Math.min(255,b*sh); }
  for(const d of B.doors){ for(let a=-5;a<=5;a++)for(let b2=-5;b2<=5;b2++){ if(a*a+b2*b2>25)continue; const i=Math.round((d.x+RM)/cs)+a,j2=Math.round((d.z+RM)/cs)+b2; if(i<0||j2<0||i>=N||j2>=N)continue; const o=(j2*N+i)*3; img[o]=255;img[o+1]=40;img[o+2]=200; } }
  for(const c of B.cols){ const i=Math.round((c.x+RM)/cs),j2=Math.round((c.z+RM)/cs); if(i<0||j2<0||i>=N||j2>=N)continue; const o=(j2*N+i)*3; img[o]=20;img[o+1]=60;img[o+2]=20; }
  cells.push({k,img,N,label:`${k} ${style}/${sz} R${R} RM${B.RM.toFixed(0)}`});
}
fs.writeFileSync('/home/user/r46/montage.json',JSON.stringify(cells.map(c=>({k:c.k,N:c.N,label:c.label,b64:Buffer.from(c.img).toString('base64')}))));
console.log('cells',cells.length);
