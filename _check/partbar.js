/* 図面・積算：役物・設備を置くときの下の帯（#nnPartBar）のボタンが押しつぶされて文字が縦に折れていないか・画面からはみ出していないか。§583
   使い方: node _check/partbar.js [ファイル]（直す前の版では スマホで★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html'; let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const [w,h,ph,n] of [[393,852,1,'たて'],[360,780,1,'たて360'],[852,393,1,'よこ'],[1440,900,0,'PC']]){
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:ph?2:1,isMobile:!!ph,hasTouch:!!ph}); p.on('dialog',d=>d.dismiss());
 await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1300);
 await p.evaluate(()=>{try{nnZMenuClose();loadSample();}catch(_){}}); await p.waitForTimeout(700);
 const res=[];
 for(const id of ['aircon','piperack','cubicle']){
  await p.evaluate(id=>{try{nnStamp(id,1)}catch(e){}},id); await p.waitForTimeout(500);
  const r=await p.evaluate(()=>{const bar=document.getElementById('nnPartBar'); if(!bar||!bar.classList.contains('on')) return null;
   const vw=document.documentElement.clientWidth, q=bar.getBoundingClientRect();
   const bad=[...bar.querySelectorAll('button')].filter(x=>x.offsetParent).filter(x=>{const fs=parseFloat(getComputedStyle(x).fontSize); return x.getBoundingClientRect().height>fs*2.6;}).map(x=>x.textContent.trim());
   return {bad, out:q.left<-1||q.right>vw+1, w:Math.round(q.width)};});
  if(r) res.push(r);
 }
 const ng=!res.length||res.some(r=>r.bad.length||r.out); if(ng)NG++;
 console.log((ng?'★NG ':'○ ')+n+' 帯'+res.length+'回 '+(res.map(r=>r.w+'px'+(r.bad.length?' 潰れ:'+r.bad.join(','):'')+(r.out?' はみ出し':'')).join(' / ')));
 await p.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
