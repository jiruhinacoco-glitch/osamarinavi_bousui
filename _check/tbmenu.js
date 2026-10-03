/* 図面・積算：ツールバーの小さな一覧（⚙ 設備追加・⋯ その他など .tbmenu）が画面の外へはみ出さないか（たて・よこ・PC × 1画面・2画面）。§582
   使い方: node _check/tbmenu.js [ファイル]（直す前の版では スマホたての2画面で「設備追加」が★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html'; let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const [w,h,ph,n] of [[393,852,1,'たて'],[852,393,1,'よこ'],[1280,720,0,'PC']]) for(const split of [0,1]){
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:ph?2:1,isMobile:!!ph,hasTouch:!!ph}); p.on('dialog',d=>d.dismiss());
 await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1300);
 await p.evaluate(()=>{try{nnZMenuClose();loadSample();}catch(_){}}); await p.waitForTimeout(800);
 if(split){ await p.evaluate(()=>{const b=document.getElementById('tl_split2')||[...document.querySelectorAll('#toolbar .tbtn')].find(x=>/2画面/.test(x.textContent+x.title)); b&&b.click();}); await p.waitForTimeout(1500); }
 const ids=await p.evaluate(()=>[...document.querySelectorAll('.tbmenuwrap > .tbtn, .tbmenuwrap > button')].filter(b=>b.offsetParent).map(b=>b.id).filter(Boolean));
 const res=[];
 for(const id of ids){
  await p.evaluate(id=>{document.getElementById(id).click();},id); await p.waitForTimeout(300);
  const r=await p.evaluate(()=>{const m=[...document.querySelectorAll('.tbmenu.on, .on.tbmenu, [id$="Menu"].on')].find(x=>x.offsetParent); if(!m) return null; const q=m.getBoundingClientRect(), vw=document.documentElement.clientWidth;
    return {id:m.id, L:Math.round(q.left), R:Math.round(q.right), vw, out:q.right>vw+1||q.left<-1};});
  if(r) res.push(r);
  await p.evaluate(()=>{try{nnTbMenusClose()}catch(_){}});
 }
 const bad=res.filter(r=>r.out); if(bad.length||!res.length) NG++;
 console.log((bad.length||!res.length?'★NG ':'○ ')+n+(split?' 2画面':' 1画面')+' 一覧'+res.length+'個'+(bad.length?' はみ出し:'+bad.map(r=>r.id+'('+r.L+'..'+r.R+'/'+r.vw+')').join(','):''));
 await p.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
