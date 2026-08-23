/* ★2026-08-23v 道具のトグル解除／対のボタンは動いている方だけ／図面に天端の帯／躯体を立体に（§165）
   node _check/tb3.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):''));if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
p.on('dialog',d=>d.accept()); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ state.polys=[];state.parts=[];state.d3sol=[];state.scaleM=1;state.specCode='AS-T1';
  drawPts=[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}]; closePoly(); });
await p.waitForTimeout(400);
/* ① 道具のトグル */
/* ★2026-08-24k 解除はツールバーの「ボタンを押したとき」だけ。実際にボタンを押して見る
   （プログラムから setTool('sel') を呼んでもモードは切れない＝下絵の選択が効かなくなる不具合の対策） */
const click=id=>p.evaluate(i=>document.getElementById(i).click(), id);
await click('tl_draw'); ok(await p.evaluate(()=>tool)==='draw','描画を選べる');
await click('tl_draw'); ok(await p.evaluate(()=>tool)==='sel','①もう一度押すと解除（選択に戻る）');
await click('tl_rect'); await click('tl_rect');
ok(await p.evaluate(()=>tool)==='sel','①範囲選択も解除できる');
await p.evaluate(()=>setTool('sel')); ok(await p.evaluate(()=>tool)==='sel','①プログラムから選択モードにしてもモードは切れない');
await click('tl_sel'); ok(await p.evaluate(()=>tool)==='none','①選択ボタンを押すと解除される');
await click('tl_sel'); ok(await p.evaluate(()=>tool)==='sel','①もう一度押すと選び直せる');
/* ② 対のボタンは動いている方だけ */
const pr=await p.evaluate(()=>{const g=i=>document.getElementById(i);const v=x=>x?getComputedStyle(x).display!=='none':null;
  return {h:v(g('tl_wari_h')),vv:v(g('tl_wari_v')),n:v(g('tl_night')),d:v(g('tl_day'))};});
ok(pr.h!==pr.vv,'②ヨコ割付／タテ割付は片方だけ出る',pr);
ok(pr.n!==pr.d && pr.d,'②夜画面／昼画面は「いま動いている方（昼）」だけ出る',pr);
await p.evaluate(()=>document.getElementById('tl_wari_h').click()); await p.waitForTimeout(400);
const pr2=await p.evaluate(()=>{const g=i=>document.getElementById(i);const v=x=>getComputedStyle(x).display!=='none';
  return {h:v(g('tl_wari_h')),vv:v(g('tl_wari_v'))};});
ok(pr2.vv&&!pr2.h,'②押すと出ている方が入れ替わる',pr2);
await p.evaluate(()=>document.getElementById('tl_day').click()); await p.waitForTimeout(400);
const pr3=await p.evaluate(()=>{const g=i=>document.getElementById(i);const v=x=>getComputedStyle(x).display!=='none';
  return {n:v(g('tl_night')),d:v(g('tl_day'))};});
ok(pr3.n&&!pr3.d,'②出ているボタンを押すと夜になり「夜画面」だけ出る',pr3);
await p.evaluate(()=>nnSetTheme('light')); await p.waitForTimeout(300);
/* ③ 図面に天端の帯が出る */
const band=await p.evaluate(()=>{
  const cv=document.getElementById('cv'), c=cv.getContext('2d');
  const s=state.scaleM, e=state.polys[0].edges[0];
  const g2=(x,y)=>[ox+x*cellPx, oy+y*cellPx];
  const [x0,y0]=g2(10,0);
  const d=(e.w/1000/s)*cellPx;
  const r=cv.width/cv.getBoundingClientRect().width;
  const inn=c.getImageData(Math.round(x0*r),Math.round((y0+6)*r),1,1).data;
  const out=c.getImageData(Math.round(x0*r),Math.round((y0-d*0.5)*r),1,1).data;
  const far=c.getImageData(Math.round(x0*r),Math.round((y0-d*2.5)*r),1,1).data;
  return {w:e.w, d:+d.toFixed(1), band:[out[0],out[1],out[2]], far:[far[0],far[1],far[2]], inn:[inn[0],inn[1],inn[2]]};
});
ok(band.w>0,'③天端幅Wが入っている',band.w);
ok(JSON.stringify(band.band)!==JSON.stringify(band.far),'③屋根の外側に天端の帯が描かれる',band);
/* ④ 平場を上げると躯体に側面が出る（天端は動かない） */
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4200);
const BODY=`()=>{let m=null;T.group.traverse(o=>{if(o.name==='nnBody')m=o;});
  if(!m)return null; m.geometry.computeBoundingBox(); const bb=m.geometry.boundingBox;
  return {top:+m.position.y.toFixed(2), h:+(bb.max.y-bb.min.y).toFixed(2)};}`;
const TOP=`()=>{let y=null;T.group.traverse(o=>{if(o.isMesh&&o.geometry&&o.geometry.type==='ExtrudeGeometry'&&o.position.y>0.2&&o.position.y<0.6)y=+o.position.y.toFixed(3);});return y;}`;
const b0=await p.evaluate(`(${BODY})()`);
await p.evaluate(()=>{ state.polys[0].lv=2; dirty3d=true; build3D(); }); await p.waitForTimeout(700);
const b1=await p.evaluate(`(${BODY})()`);
ok(b1&&b1.h>=1.95&&b1.top>=1.95,'④平場を2m上げると躯体に側面ができる（立体の高さが増える）',{前:b0,後:b1});
ok(await p.evaluate(()=>state.polys[0].bodyLv||0)===0,'④天端（パラペット）の高さは変わらない');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
