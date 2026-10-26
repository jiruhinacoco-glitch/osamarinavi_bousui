/* ★§829 図面・積算：最初の画面（看板を選ぶ所）で three.js を読まない・看板を選ぶと3D見本が動く（スマホ/PC）。使い方: node _check/zm3dlazy.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright'); let ng=0;
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const ph of [1,0]){
 const c=await b.newContext(ph?{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA}:{viewport:{width:1300,height:800}}); const p=await c.newPage();
 let three=0; p.on('request',r=>{ if(/three\.min\.js/.test(r.url())) three++; });
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(3500);
 const t1=three; await p.click('#nnZMenu .zmPk[data-pick="zu"]'); 
 const ok=await p.waitForFunction(()=>typeof THREE!=='undefined' && document.querySelector('#nnZMenu .zmCard canvas'),null,{timeout:15000}).then(()=>true).catch(()=>false);
 const mv=await p.evaluate(()=>{ const cv=document.querySelector('#nnZMenu .zmCard canvas'); return cv?[cv.width,cv.height]:null; });
 const good=t1===0&&ok&&!errs.length; if(!good) ng++; console.log((good?'○ ':'★NG ')+(ph?'スマホ':'PC')+' 最初の画面で three 読込 '+t1+'回／看板を選ぶと3D見本 '+(ok?'動く':'動かない')+' '+JSON.stringify(mv)+' エラー'+errs.length);
 await c.close(); }
console.log(ng?'★NG '+ng+'件':'全項目○'); await b.close();})();
