/* ★§837 ホームのお知らせ：スマホは横スワイプ・PCは ›ボタンで2ページ目へ送れる。使い方: node _check/newsswipe.js <写真の保存先> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const S=process.argv[2];
(async()=>{const b=await chromium.launch(); let ng=0;
for(const ph of [1,0]){
 const c=await b.newContext(ph?{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA}:{viewport:{width:1300,height:760}}); const p=await c.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/index.html'); await p.waitForTimeout(2000);
 const box=await (await p.$('.notice')).boundingBox();
 const shot=async n=>{ await p.screenshot({path:S+'/news_'+(ph?'sp':'pc')+n+'.png',clip:{x:box.x-4,y:box.y-4,width:box.width+8,height:box.height+8}}); };
 await shot(1);
 if(ph){ const sb=await (await p.$('#nnNewsSw')).boundingBox(); const y=sb.y+sb.height/2;
   const cdp=await c.newCDPSession(p);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sb.x+sb.width*0.85,y}]});
   for(let k=1;k<=8;k++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sb.x+sb.width*(0.85-0.08*k),y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 } else { await p.click('.notice .nvn'); }
 await p.waitForTimeout(900);
 const r=await p.evaluate(()=>{ const sw=document.getElementById('nnNewsSw'); return {page:Math.round(sw.scrollLeft/sw.clientWidth), on:[...document.querySelectorAll('#dots .dot')].findIndex(i=>i.classList.contains('on')), txt:sw.querySelectorAll('.npg')[Math.round(sw.scrollLeft/sw.clientWidth)].querySelector('b').textContent}; });
 await shot(2);
 const good=r.page===1&&r.on===1&&!errs.length; if(!good) ng++;
 console.log((good?'○ ':'★NG ')+(ph?'スマホ スワイプ':'PC ›ボタン')+'で2ページ目へ',JSON.stringify(r),'エラー',errs.length);
 await c.close(); }
console.log(ng?'★NG '+ng+'件':'全項目○'); await b.close();})();
