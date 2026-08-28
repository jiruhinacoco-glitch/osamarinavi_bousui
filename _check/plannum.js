/* 平面図PDFに刷られる数字が、手で計算した値と合っているか
   24m×16m の屋根／立上り300mm／天端250mm で
     平場 384.0㎡・周長 80.0m・立上り 24.0㎡（80×0.3）・天端 20.0㎡（80×0.25）
   使い方: node _check/plannum.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m)=>{console.log((c?'○   ':'★NG ')+m); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1500,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(800);
const r=await p.evaluate(()=>{
  state.scaleM=1;
  state.polys=[{name:'屋根①',lv:0,pts:[{x:0,y:0},{x:24,y:0},{x:24,y:16},{x:0,y:16}],
    edges:[{k:'para',h:300,w:250},{k:'para',h:300,w:250},{k:'para',h:300,w:250},{k:'para',h:300,w:250}],holes:[]}];
  commit();
  let html=''; const ow=window.open;
  window.open=()=>({document:{open(){},write(s){html+=s;},close(){}},focus(){},print(){},close(){},addEventListener(){}});
  let err=''; try{ nnPlanPDF(); }catch(e){ err=String(e).slice(0,110); }
  window.open=ow;
  const q=quantities(state.polys[0],1);
  return {err, txt:html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' '),
    q:{hira:q.hira, tachi:q.tachi, tenba:q.tenba, per:q.per}};
});
ok(!r.err,'平面図が作れる '+(r.err||''));
/* 手の計算 */
const per=2*(24+16), hira=24*16, tachi=per*0.3, tenba=per*0.25;
console.log('     手の計算：平場'+hira+'㎡・周長'+per+'m・立上り'+tachi+'㎡・天端'+tenba+'㎡');
console.log('     アプリ  ：平場'+r.q.hira+'㎡・周長'+r.q.per+'m・立上り'+r.q.tachi+'㎡・天端'+r.q.tenba+'㎡');
ok(Math.abs(r.q.hira-hira)<0.05,'平場の面積が手の計算と同じ');
ok(Math.abs(r.q.per-per)<0.05,'周長が手の計算と同じ');
ok(Math.abs(r.q.tachi-tachi)<0.05,'立上りの面積が手の計算と同じ（周長×0.3）');
ok(Math.abs(r.q.tenba-tenba)<0.05,'天端の面積が手の計算と同じ（周長×0.25）');
/* 紙に出ているか（寸法はm・図面の下の数量表） */
[['24.0','よこの総寸法 24.0m'],['16.0','たての総寸法 16.0m'],
 ['384.0','平場 384.0㎡'],['24.0','立上り 24.0㎡'],['20.0','天端 20.0㎡'],['80.0','周長 80.0m'],
 ['H300','立上り H300'],['W250','天端 W250']].forEach(([s,m])=>{
  ok(r.txt.includes(s), '紙に「'+s+'」が出る（'+m+'）');
});
ok(/寸法単位/.test(r.txt),'寸法の単位が凡例に書いてある');
ok(!/NaN|undefined|Infinity/.test(r.txt),'NaN・undefined が刷られない');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
