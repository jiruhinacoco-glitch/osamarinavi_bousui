/* ★2026-09-08ag §353 増張り（防水層を設置）の線は 45度きざみに限る（本人の指示）
   使い方: node _check/ang45.js  ／ 直す前と比べる: node _check/ang45.js _before.html */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8899/'+FILE); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}}); await p.waitForTimeout(800);
await p.evaluate(()=>{ state.scaleM=1;
  const pts=[{x:0,y:0},{x:20,y:0},{x:20,y:16},{x:0,y:16}];
  state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({k:'para',h:300,w:250}))}];
  state.parts=[];state.d3sol=[];state.d3sheet=[]; saveState(); setTab('d3'); });
await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:20000});

/* 平場に1点目を置いた状態を作り、狙いを360度ぐるりと回して角度を確かめる */
const R=await p.evaluate(()=>{
  window.nnSheetMode={mat:{n:'T',col:'#333',src:'free'},kind:'poly',w:400,d:200,t:4};
  const res=[], seen={};
  for(let a=0;a<360;a+=3){
    const r=a*Math.PI/180, L=1.37;                      /* 半端な長さで狙う */
    const raw=[3+Math.cos(r)*L, 3+Math.sin(r)*L];
    let q=null; try{ q=nnD3PlaneSnapTest([3,3], raw); }catch(e){ return {err:String(e)}; }
    if(!q) continue;
    const d=Math.round(Math.atan2(q[1]-3,q[0]-3)*180/Math.PI);
    const dd=((d%360)+360)%360;
    res.push(dd); seen[dd]=1;
  }
  return {res, kinds:Object.keys(seen).map(Number).sort((x,y)=>x-y)};
});
if(R.err){ ok(false,'計算できた',R.err); }
else{
  const bad=R.res.filter(d=>Math.min(Math.abs(d%45), 45-Math.abs(d%45))>1);
  ok(bad.length===0,'★増張りの線は 45度きざみだけ（0/45/90/…/315）',{n:R.res.length,bad:bad.slice(0,8),kinds:R.kinds});
  ok(R.kinds.length===8,'8方向すべてが出せる',R.kinds);
}
/* 長さは5cmきざみ */
const L=await p.evaluate(()=>{ const q=nnD3PlaneSnapTest([3,3],[3+1.37,3.02]); return +Math.hypot(q[0]-3,q[1]-3).toFixed(4); });
ok(Math.abs(L*100-Math.round(L*100))<0.001 && Math.abs(Math.round(L/0.05)*0.05-L)<1e-6,'長さは5cmきざみ',L);
/* 立体づくり（防水層でない）は今までどおり5度きざみ */
const F=await p.evaluate(()=>{ window.nnSheetMode=null;
  const out=[]; for(let a=0;a<360;a+=3){ const r=a*Math.PI/180;
    const q=nnD3PlaneSnapTest([3,3],[3+Math.cos(r)*1.37, 3+Math.sin(r)*1.37]);
    if(q) out.push(((Math.round(Math.atan2(q[1]-3,q[0]-3)*180/Math.PI)%360)+360)%360); }
  return out.filter(d=>Math.min(Math.abs(d%45),45-Math.abs(d%45))>1).length; });
ok(F>0,'立体づくり（防水層でないとき）は今までどおり細かい角度が使える',F);
ok(errs.length===0,'JSエラーなし',errs);
console.log(ng?('★NG '+ng+'件'):'○ 0件'); await b.close(); process.exit(ng?1:0);
})();
