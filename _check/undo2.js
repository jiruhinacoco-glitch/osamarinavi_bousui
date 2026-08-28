/* 「↩戻る／↪進む」が、屋根の形だけでなく役物・3Dで作った立体まで面倒を見るか
   ★役物を置いたあと戻ると「役物は残ってひとつ前の屋根が消える」不具合があった（2026-08-28h）
   使い方: node _check/undo2.js   （先に python3 -m http.server 8899 を立てる）
   直す前と比べる: node _check/undo2.js _before.html */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
const R4=[{k:'para',h:300,w:250},{k:'para',h:300,w:250},{k:'para',h:300,w:250},{k:'para',h:300,w:250}];
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(700);

const r=await p.evaluate(async(R4)=>{
  const S=()=>({poly:state.polys.length, part:(state.parts||[]).length, sol:(state.d3sol||[]).length});
  const L=[];
  state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:10},{x:0,y:10}],edges:JSON.parse(JSON.stringify(R4)),holes:[]}];
  state.parts=[]; state.d3sol=[]; commit();
  state.polys.push({name:'屋根②',lv:0,pts:[{x:30,y:0},{x:40,y:0},{x:40,y:8},{x:30,y:8}],edges:JSON.parse(JSON.stringify(R4)),holes:[]});
  commit(); L.push(['屋根2つ',S()]);
  nnStamp('dakki',1); await new Promise(s=>setTimeout(s,250)); nnPlaceAtGrid(5,5);
  L.push(['役物を1個置いた',S()]);
  state.d3sol.push({p:[2,0.02,2],n:[0,1,0],u:[1,0,0],v:[0,0,1],a:[0,0],b:[2,2],d:0.6,mode:'out'});
  saveState(); L.push(['立体を1つ足した',S()]);
  undoStep(); L.push(['↩1回',S()]);
  undoStep(); L.push(['↩2回',S()]);
  undoStep(); L.push(['↩3回',S()]);
  redoStep(); L.push(['↪1回',S()]);
  redoStep(); redoStep(); L.push(['↪3回',S()]);
  return L;
}, R4);
const g=n=>r.find(x=>x[0]===n)[1];
r.forEach(x=>console.log('     '+x[0].padEnd(14)+' 屋根'+x[1].poly+' 役物'+x[1].part+' 立体'+x[1].sol));
ok(g('役物を1個置いた').part===1,'役物を置くと1個');
ok(g('立体を1つ足した').sol===1,'立体を足すと1つ');
ok(g('↩1回').sol===0 && g('↩1回').poly===2 && g('↩1回').part===1,'↩1回＝立体だけ戻る（屋根は消えない）');
ok(g('↩2回').part===0 && g('↩2回').poly===2,'↩2回＝役物だけ戻る（屋根は消えない）');
ok(g('↩3回').poly===1,'↩3回＝屋根②が戻る');
ok(g('↪1回').poly===2 && g('↪1回').part===0,'↪1回＝屋根②が復活');
ok(g('↪3回').poly===2 && g('↪3回').part===1 && g('↪3回').sol===1,'↪3回＝役物・立体まで復活');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
