/* 高速な操作（連打・タブの切り替え）でおかしくならないか
   ★競合（先に始めた処理が後の処理を上書きする）は、遅い端末や指の速い人でだけ出る。
     機械で連打して先に見つける。
   使い方: node _check/race1.js   （先に python3 -m http.server 8899 を立てる） */
let NG=0;
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
// ① 図面：3Dの読み込み中にタブを高速で切り替える
let p=await b.newPage({viewport:{width:1500,height:950}});
let errs=[]; p.on('pageerror',e=>errs.push('図面:'+String(e).split('\n')[0].slice(0,110))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(700);
let r=await p.evaluate(async()=>{
  loadSample(); await new Promise(s=>setTimeout(s,300));
  const T=['zu','wari','sect','d3'];
  for(let i=0;i<60;i++){ setTab(T[i%4]); await new Promise(s=>setTimeout(s,25)); }
  await new Promise(s=>setTimeout(s,1500));
  // そのあと使えるか
  setTab('zu'); await new Promise(s=>setTimeout(s,300));
  return {polys:state.polys.length, tab:(typeof tab!=='undefined'?tab:'?')};
});
if(errs.length||r.polys!==3)NG++;
console.log((errs.length||r.polys!==3?'★NG ':'○   ')+'①タブ高速切替60回 '+JSON.stringify(r)+(errs.length?('  '+[...new Set(errs)].slice(0,3).join(' / ')):''));
// ② 図面：戻る・進むを高速連打
errs=[];
r=await p.evaluate(async()=>{
  for(let i=0;i<40;i++){ state.polys[0].pts[0].x+=0.1; commit(); }
  for(let i=0;i<60;i++){ undoStep(); }
  for(let i=0;i<60;i++){ redoStep(); }
  for(let i=0;i<30;i++){ undoStep(); redoStep(); }
  return {polys:state.polys.length, hi:(typeof hi!=='undefined'?hi:'?'), hist:(typeof hist!=='undefined'?hist.length:'?')};
});
if(errs.length||r.polys!==3)NG++;
console.log((errs.length||r.polys!==3?'★NG ':'○   ')+'②戻る進む連打 '+JSON.stringify(r)+(errs.length?('  '+[...new Set(errs)].slice(0,3).join(' / ')):''));
await p.close();
// ③ 記録帳：画面切替と絞り込みを高速で
p=await b.newPage({viewport:{width:1500,height:950}});
errs=[]; p.on('pageerror',e=>errs.push('記録帳:'+String(e).split('\n')[0].slice(0,110))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2300);
r=await p.evaluate(async()=>{
  const V=['dash','list','zentai','jisha'];
  for(let i=0;i<40;i++){ try{ showView(V[i%4]); }catch(e){} await new Promise(s=>setTimeout(s,20)); }
  showView('list'); await new Promise(s=>setTimeout(s,600));
  const q=document.querySelector('.search input');
  if(q){ for(const s of ['サ','サン','サン太','','八','']){ q.value=s; q.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,30)); } }
  /* ★一覧は「まず14件→残りは次のコマ」の2段組み立て（§95）。
     時間で待たず、件数が落ち着くまで待つ（§161の教訓：動きの完了は条件で待つ）。 */
  let n=0, same=0;
  for(let i=0;i<60;i++){
    await new Promise(s=>setTimeout(s,100));
    const c=document.querySelectorAll('#list .pcard').length;
    if(c===n){ if(++same>=3) break; } else { n=c; same=0; }
  }
  return {cards:n, all:props.length};
});
if(errs.length||r.cards!==r.all)NG++;
console.log((errs.length||r.cards!==r.all?'★NG ':'○   ')+'③画面切替40回＋検索連打 '+JSON.stringify(r)+(errs.length?('  '+[...new Set(errs)].slice(0,3).join(' / ')):''));
await b.close();
console.log(NG?('\n★NG '+NG+'件'):'\n全部○');
process.exit(NG?1:0);})();
