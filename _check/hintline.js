/* 図面・積算：作図中の黒いヒントの帯（#hint）が、図の左下にかく「方眼：1マス＝◯m…」の行に重ならないか（PC・スマホ）
   使い方: node _check/hintline.js [ファイル]（直す前の版では PC が★NG）。§575 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html'; let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [w,h,ph,n] of [[1440,900,0,'PC1440'],[1280,720,0,'PC1280'],[1920,1080,0,'PC1920'],[393,852,1,'たて'],[852,393,1,'よこ']]){
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:ph?2:1,isMobile:!!ph,hasTouch:!!ph});
 await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1500);
 await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}}); await p.waitForTimeout(800);
 for(const tool of ['draw','box','sel']){
  const r=await p.evaluate(t=>{try{setMode(t)}catch(_){}
    const hi=document.getElementById('hint'), cv=document.getElementById('cv');
    if(!hi||getComputedStyle(hi).display==='none') return {skip:1};
    const a=hi.getBoundingClientRect(), c=cv.getBoundingClientRect();
    /* 案内文の行は fillText(…, 12, H-10)、11px の文字＝下から約7〜20px（画面のpx） */
    const top=c.bottom-21, bot=c.bottom-6;
    return {hintBottom:Math.round(a.bottom), lineTop:Math.round(top), over:a.bottom>top && a.top<bot && a.left<c.left+300};
  },tool);
  if(r.skip){console.log('－ ['+n+'] '+tool+' ヒントなし');continue;}
  if(r.over)NG++;
  console.log((r.over?'★NG ':'○ ')+'['+n+'] '+tool+' ヒントの下端 '+r.hintBottom+' / 案内文の行の上端 '+r.lineTop);
 }
 await p.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
