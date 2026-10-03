/* 現場記録帳ダッシュボード：各枠の「詳細設定」の小窓（dialog#dashSettings）が画面の中央に出るか（左上の角に貼り付かない）。§584
   使い方: node _check/dashdlg.js [ファイル]（直す前の版では PC・スマホとも★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'kirokucho_demo.html'; let NG=0;
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [w,h,ph,n] of [[1440,900,0,'PC'],[393,852,1,'たて'],[852,393,1,'よこ']]){
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:ph?2:1,isMobile:!!ph,hasTouch:!!ph});
 await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1800);
 const bt=await p.$$('#dashboard .dash-settings-btn'); if(!bt.length){NG++;console.log('★NG '+n+' 詳細設定ボタンなし');continue;}
 await bt[0].click(); await p.waitForTimeout(600);
 const r=await p.evaluate(()=>{const d=document.getElementById('dashSettings'); const q=d.getBoundingClientRect(), vw=document.documentElement.clientWidth, vh=document.documentElement.clientHeight;
   /* 左右の余白の差・上下の余白の差（中央なら0に近い） */
   return {open:d.open, dx:Math.round(Math.abs(q.left-(vw-q.right))), dy:Math.round(Math.abs(q.top-(vh-q.bottom))), L:Math.round(q.left), T:Math.round(q.top)};});
 const ok=r.open&&r.dx<=4&&r.dy<=4; if(!ok)NG++;
 console.log((ok?'○ ':'★NG ')+n+' 左'+r.L+' 上'+r.T+' 左右の差'+r.dx+' 上下の差'+r.dy);
 await p.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
