const {Worlds}=require('./sim.js');
const [style,sz,seed,R,nd]=[process.argv[2],process.argv[3],+process.argv[4],+process.argv[5],+process.argv[6]];
const n={i:0,style,size:sz,R,seed,adj:Array.from({length:nd},(_,i)=>i+1),prey:[],chests:[],home:false,name:'t',region:'x',loc:{k:'x'},depth:1};
location.search=process.env.Q||''; const B=Worlds._debug.buildNode(n);
console.log('lay',B.lay,'kind',B.lp&&B.lp.kind,'tag',B.tag.slice(0,100));
B.doors.forEach((d,i)=>{ let mn=1e9,mx=-1e9,pm=null; const pts=[]; for(let a=0;a<12;a++)for(const rr of [1,2.5]){ const x=d.x+Math.cos(a*0.5236)*rr,z=d.z+Math.sin(a*0.5236)*rr,y=B.H(x,z); pts.push([a*30,rr,+y.toFixed(2),+(B.edge(x,z)[0]).toFixed(1)]); if(y<mn)mn=y;if(y>mx){mx=y;}}
 console.log('door',i,d.x.toFixed(1),d.z.toFixed(1),'a',(d.a*57.3).toFixed(0),'y0',B.H(d.x,d.z).toFixed(2),'dy',(mx-mn).toFixed(2),'edge',B.edge(d.x,d.z)[0].toFixed(1)); if(mx-mn>0.9) console.log(JSON.stringify(pts.filter(p=>p[1]==2.5)));});
