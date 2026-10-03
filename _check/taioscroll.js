/* 要対応の表（2段またぎ）：右の列を横へ送るスクロールの入れ物が、枠の中に収まっているか（横スクロールバーが枠の下に隠れない）
   使い方: node _check/taioscroll.js [ファイル]（直す前の版では★NG 4件）。§574 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'kirokucho_demo.html'; let NG=0;
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',ignoreDefaultArgs:['--hide-scrollbars']});
for(const [w,h,ph,n] of [[393,852,1,'tate'],[852,393,1,'yoko'],[1440,900,0,'pc'],[1280,720,0,'pcS']]){
const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:ph?2:1,isMobile:!!ph,hasTouch:!!ph});
await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1800);
const r=await p.evaluate(()=>{
 const pn=document.querySelector('#dashboard .dpanel[data-panel-id="taio"]'); const sb=pn.querySelector('.taio-scroll');
 const P=pn.getBoundingClientRect(), S=sb.getBoundingClientRect();
 const needX=sb.scrollWidth>sb.clientWidth+1;
 const barH=sb.offsetHeight-sb.clientHeight; // 横スクロールバーの太さ
 return {span2:pn.classList.contains('nn-panel-span2'),needX,barH,sbBottom:Math.round(S.bottom),pBottom:Math.round(P.bottom),canY:sb.scrollHeight>sb.clientHeight||sb.parentElement.scrollHeight>sb.parentElement.clientHeight};
});
/* 横に送る必要があるなら、横スクロールバーが枠の中に見えていること */
const ok=!r.needX || (r.barH>0 && r.sbBottom<=r.pBottom+1) || /* スマホは隠れたバーでも指で送れるので入れ物の下端が枠内か */ (ph&&r.sbBottom<=r.pBottom+1);
if(!ok)NG++;
console.log((ok?'○ ':'★NG ')+n+' '+JSON.stringify(r));
await p.close();}
await b.close(); console.log(NG?'★NG '+NG:'全部○');})();
