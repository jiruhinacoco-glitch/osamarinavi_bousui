/* 段差ラインで屋根を2つに分けたとき、辺の設定（笠木・アゴ・壁厚・取り合い・弧）が消えないか
   ★ek() は「知っている項目だけ」を返すので、足し忘れるとその項目だけ静かに消える（§234）
   使い方: node _check/split5.js   （先に python3 -m http.server 8899 を立てる）
   直す前と比べる: node _check/split5.js _before.html */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(700);
const r=await p.evaluate(()=>{
  const E=()=>({k:'para',h:300,w:250,kasagi:1,ago:1,agoD:120,wall:200,tor:'mikiri'});
  state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:10},{x:0,y:10}],
    edges:[E(),E(),E(),E()],holes:[]}];
  state.active=0; commit();
  const cnt=a=>({kasagi:a.filter(e=>e.kasagi).length, ago:a.filter(e=>e.ago).length,
                 wall:a.filter(e=>e.wall>0).length, tor:a.filter(e=>e.tor==='mikiri').length,
                 h:a.filter(e=>e.h===300).length});
  const before=cnt(state.polys[0].edges);
  doSplit(state.polys[0], {e:0,t:0.5,pt:{x:10,y:0}}, {e:2,t:0.5,pt:{x:10,y:10}}, []);
  return {before, n:state.polys.length, after:state.polys.map(P=>cnt(P.edges)), names:state.polys.map(P=>P.name)};
});
console.log('     分ける前 '+JSON.stringify(r.before));
r.after.forEach((a,i)=>console.log('     '+r.names[i]+' '+JSON.stringify(a)));
ok(r.n===2,'2つに分かれる ('+r.n+')');
/* 分けたあとの各屋根は、元の外周の辺3本＋新しい段差の壁1本 */
ok(r.after.every(a=>a.kasagi===3),'アルミ笠木が消えない（各3本）');
ok(r.after.every(a=>a.ago===3),'水切りアゴが消えない（各3本）');
ok(r.after.every(a=>a.wall===3),'壁の厚みが消えない（各3本）');
ok(r.after.every(a=>a.tor===3),'取り合いの納まりが消えない（各3本）');
ok(r.after.every(a=>a.h>=3),'立上りの高さが消えない（段差の壁も既定300なので4本）');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
