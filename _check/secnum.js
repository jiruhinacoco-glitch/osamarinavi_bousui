/* 断面詳細図・標準納まり詳細図に、入力した寸法がそのまま出ているか
   ★立上りH・天端Wを変えたのに図の数字が変わらなければ、別の図を見せていることになる。
   使い方: node _check/secnum.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(800);

const run=async(H,W)=>await p.evaluate(([H,W])=>{
  state.scaleM=1;
  const E=()=>({k:'para',h:H,w:W});
  state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],
    edges:[E(),E(),E(),E()],holes:[]}];
  commit();
  const mj=(window.nnMajorHW?nnMajorHW():{H:0,W:0});
  let html=''; const ow=window.open;
  window.open=()=>({document:{open(){},write(s){html+=s;},close(){}},focus(){},print(){},close(){},addEventListener(){}});
  let err=''; try{ nnSectionPDF(); }catch(e){ err='断面:'+String(e).slice(0,80); }
  const sec=html; html='';
  try{ if(window.nnDetailPDF) nnDetailPDF({H:H, kind:'tanmatsu'}); }catch(e){ err+=' 納まり:'+String(e).slice(0,80); }
  const det=html;
  window.open=ow;
  const flat=s=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  return {err, mj, sec:flat(sec), det:flat(det)};
}, [H,W]);

for(const [H,W] of [[300,250],[450,320],[600,150]]){
  const r=await run(H,W);
  ok(!r.err,'H'+H+'/W'+W+'：図が作れる '+(r.err||''));
  ok(r.mj.H===H && r.mj.W===W,'H'+H+'/W'+W+'：代表の寸法がその値になる ('+r.mj.H+'/'+r.mj.W+')');
  ok(r.sec.includes(String(H)),'H'+H+'：断面詳細図に立上り '+H+' が出る');
  ok(r.sec.includes(String(W)),'W'+W+'：断面詳細図に天端 '+W+' が出る');
  ok(!/NaN|undefined|Infinity/.test(r.sec),'H'+H+'：断面詳細図に NaN が出ない');
  if(r.det.length>500){
    ok(r.det.includes(String(H)),'H'+H+'：標準納まり詳細図にも立上り '+H+' が出る');
    ok(!/NaN|undefined|Infinity/.test(r.det),'H'+H+'：標準納まり詳細図に NaN が出ない');
  }
}
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
