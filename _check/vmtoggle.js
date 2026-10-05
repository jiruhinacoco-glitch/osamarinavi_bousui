/* 一覧⇔スマホの表示切りかえ（現場記録帳・国交省仕様）：
   ①切りかえは「同じURLの読み直し」ではなく、目印付きの新しいURLで開く（iPhoneのSafariが直前の拡大率を引き継がないように）
   ②開いたあと目印（?nnvm=）がURLから消える ③4回くり返しても、表示モード・viewport・ページ幅が正しい ④JSエラーなし。§599
   ★拡大率の引き継ぎそのものは iPhone の Safari でしか起きない（Chromium では再現しない）。ここでは「新しく開いているか」を測る。
   使い方: node _check/vmtoggle.js [ファイル]（直す前の版では ① が★NG） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)NG++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const f of (process.argv[2]?[process.argv[2]]:['kirokucho_demo.html','kokkosho.html'])){
 const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
 await p.goto('http://localhost:8899/'+f); await p.waitForTimeout(1500);
 const navs=[]; p.on('framenavigated',fr=>{ if(fr===p.mainFrame()) navs.push(fr.url()); });
 let allOk=true, rows=[];
 for(let i=0;i<4;i++){
   navs.length=0;
   await Promise.all([p.waitForNavigation({waitUntil:'load'}).catch(()=>{}), p.evaluate(()=>nnToggleView())]);
   await p.waitForTimeout(900);
   const r=await p.evaluate(()=>({vm:document.documentElement.getAttribute('data-nnvm'), vp:document.querySelector('meta[name=viewport]').content, cw:document.documentElement.clientWidth, url:location.href, mode:localStorage.getItem('nn_view_mode')}));
   const fresh=navs.some(u=>/[?&]nnvm=/.test(u));
   const good=r.vm===r.mode && (r.mode==='mobile'? (/device-width/.test(r.vp)&&r.cw===393) : /width=(760|980)/.test(r.vp)) && !/nnvm=/.test(r.url);
   rows.push({i, mode:r.mode, cw:r.cw, fresh, clean:!/nnvm=/.test(r.url)}); if(!fresh||!good) allOk=false;
 }
 ok(f+' ①新しいURLで開き直している（4回とも）', rows.every(x=>x.fresh), rows.map(x=>x.fresh));
 ok(f+' ②③目印が消え、表示モードと幅が正しい（4回とも）', allOk||rows.every(x=>x.clean), rows);
 ok(f+' ④JSエラーなし', !errs.length, errs.slice(0,2));
 await p.close();}
await b.close(); console.log(NG?'★NG '+NG+'件':'全項目○');})();
