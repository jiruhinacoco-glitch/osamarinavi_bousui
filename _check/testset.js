/* 本人の依頼（2026-11-01）：データの保存・復元の「🧪 巡回のテスト4件を入れる」。いまのデータを消さずに4件が足され、写真・発注・図面が付く。2回押しても増えない。
   node _check/testset.js [index.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const path=require('path'), fs=require('fs');
const file=process.argv[2]||'index.html', root=path.resolve(__dirname,'..');
let ng=0; const ok=(t,c,d)=>{ console.log((c?'○ ':'★NG ')+t+(c?'':' '+JSON.stringify(d))); if(!c)ng++; };
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
 await ctx.route('https://ts.test/**',async r=>{let f=decodeURIComponent(new URL(r.request().url()).pathname.slice(1)); if(f==='index.html')f=file;
   const q=path.resolve(root,f); if(fs.existsSync(q)) r.fulfill({path:q}); else r.fulfill({status:404,body:''});});
 const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('https://ts.test/index.html'); await p.waitForTimeout(1200);
 /* 本人の端末と同じく、自分で足した物件がすでに1件ある（番号 J110・id 101 でぶつかる） */
 await p.evaluate(()=>localStorage.setItem('nn_kirokucho_props_v1',JSON.stringify({v:1,seq:101,add:[JSON.stringify({id:101,code:'J110',name:'本人の物件',status:'見積済',kouhou:'FRP防水(L-FF)',m:10,un:'㎡'})],edit:{},del:[]})));
 const has=await p.evaluate(()=>{ try{ nnDataOpen(); }catch(_){} return !!document.getElementById('nnBkTest'); });
 ok('データの保存・復元に「巡回のテスト4件を入れる」がある', has);
 if(has){ await p.click('#nnBkTest'); await p.waitForFunction(()=>window.nnTestSetDone,null,{timeout:10000}).catch(()=>{}); }
 await p.goto('https://ts.test/kirokucho_demo.html'); await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>{ const T=props.filter(x=>/^テスト/.test(x.name)); const codes=props.map(x=>x.code);
   return {n:props.length, own:props.some(x=>x.name==='本人の物件'), t:T.map(x=>x.code+':'+(nnPhotoOf(x)?'写真':'なし')), dup:codes.filter((c,i)=>codes.indexOf(c)!==i)}; });
 ok('4件が足され、本人の物件は残る（全104＋1件）', r.n===105&&r.own&&r.t.length===4, r);
 ok('4件とも写真つき・番号の重複なし', r.t.every(x=>/写真/.test(x))&&!r.dup.length, r);
 const z=await p.evaluate(()=>{ const T=props.filter(x=>/^テスト/.test(x.name)).map(x=>x.code); const S=JSON.parse(localStorage.getItem('nn_zumen_saves_v1')||'[]'); const H=JSON.parse(localStorage.getItem('nn_hacchu_hist')||'[]');
   return {saves:T.filter(c=>S.some(s=>s.code===c)).length, hist:T.filter(c=>H.some(h=>h.gid===c)).length}; });
 ok('図面（4件）と発注履歴（4件）が同じ番号で付く', z.saves===4&&z.hist===4, z);
 await p.goto('https://ts.test/index.html'); await p.waitForTimeout(1000);
 await p.evaluate(()=>{ window.nnTestSetDone=false; nnDataOpen(); }); await p.click('#nnBkTest'); await p.waitForFunction(()=>window.nnTestSetDone,null,{timeout:10000}).catch(()=>{});
 await p.goto('https://ts.test/kirokucho_demo.html'); await p.waitForTimeout(2000);
 ok('2回押しても増えない', await p.evaluate(()=>props.length)===105);
 ok('JSエラーなし', !errs.length, errs);
 await b.close(); console.log(ng?'★NG '+ng:'全部○');
})();
