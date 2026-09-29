/* ★2026-09-29h 写真の保存場所を IndexedDB へ（§546）
   使い方: node _check/photoidb.js [kirokucho_demo.html] [zumen_sekisan.html]
   ○/★NG：①localStorage の写真（図面のピン2枚・一覧カード1枚）が開いたときに IndexedDB へ移り、localStorage から消える・画面に出る
          ②図面で40枚（合計5MB超＝localStorageでは入らない量）撮っても全部残り、開き直しても40枚
          ③一覧カードの写真を入れると IndexedDB に入る（localStorage には書かない）
          ④ホームの書き出しに写真が入る・読み込むと写真が入れ替わる ⑤JSエラーなし
   ★検算は nn_photos.js を使わず IndexedDB を直に読む */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
const K=process.argv[2]||'kirokucho_demo.html', Z=process.argv[3]||'zumen_sekisan.html';
const U='http://localhost:8899/';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:1400,height:900}});
 await ctx.addInitScript(()=>{
   window.RAWIDB=(ns)=>new Promise(r=>{ let q; try{ q=indexedDB.open('nn_photos_v1'); }catch(_){ r({}); return; }
     q.onupgradeneeded=()=>{ q.transaction.abort(); r({}); };
     q.onsuccess=()=>{ try{ const g=q.result.transaction('photos').objectStore('photos').getAll(); g.onsuccess=()=>{ const o={}; g.result.filter(x=>x.ns===ns).forEach(x=>o[x.id]=x.v); q.result.close(); r(o); }; }catch(_){ q.result.close(); r({}); } };
     q.onerror=()=>r({}); });
   /* 雑音の写真（JPEGで大きくなる） */
   window.NOISE=(w,h,q)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'), im=x.createImageData(w,h);
     for(let i=0;i<im.data.length;i++) im.data[i]=(Math.random()*256)|0; x.putImageData(im,0,0); return c.toDataURL('image/jpeg',q||0.9); };
   window.NOISEFILE=(w,h)=>new Promise(r=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'), im=x.createImageData(w,h);
     for(let i=0;i<im.data.length;i++) im.data[i]=(Math.random()*256)|0; x.putImageData(im,0,0); c.toBlob(bl=>r(new File([bl],'p.jpg',{type:'image/jpeg'})),'image/jpeg',0.9); });
 });
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 /* ① 移し替え */
 await p.goto(U+K); await p.waitForTimeout(800);
 await p.evaluate(()=>new Promise(r=>{ localStorage.clear(); const q=indexedDB.deleteDatabase('nn_photos_v1'); q.onsuccess=q.onerror=q.onblocked=()=>r(); }));
 await p.goto(U+'index.html');   /* いったん離れて接続を切る */
 await p.evaluate(()=>new Promise(r=>{ const q=indexedDB.deleteDatabase('nn_photos_v1'); q.onsuccess=q.onerror=q.onblocked=()=>r(); }));
 await p.evaluate(()=>{ const d=NOISE(80,60,0.5);
   localStorage.setItem('nn_zumen_photos_v1',JSON.stringify({ph1:{d:d,t:1,code:'J051',bukken:'',w:80,h:60,memo:'m1'},ph2:{d:d,t:2,code:'J051',bukken:'',w:80,h:60,memo:'m2'}}));
   localStorage.setItem('nn_kirokucho_photo_v1',JSON.stringify({J051:d})); });
 await p.goto(U+K); await p.waitForFunction(()=>typeof props!=='undefined'&&document.readyState==='complete'); await p.waitForTimeout(1200);
 const m1=await p.evaluate(async()=>{ const z=await RAWIDB('nn_zumen_photos_v1'), c=await RAWIDB('nn_kirokucho_photo_v1');
   const pr=props.find(x=>x.code==='J051');
   selectedId=pr.id; curTab='写真'; showView('list'); openDetailFull(); await new Promise(r=>setTimeout(r,500));
   return {z:Object.keys(z).length, c:Object.keys(c).length, lsZ:localStorage.getItem('nn_zumen_photos_v1'), lsC:localStorage.getItem('nn_kirokucho_photo_v1'),
     card:!!nnPhotoOf(pr), tab:document.querySelectorAll('#detail .ph-grid .thumb, .ph-grid .thumb').length}; });
 ok('①図面のピン2枚・一覧カード1枚が IndexedDB に移る', m1.z===2&&m1.c===1, JSON.stringify({z:m1.z,c:m1.c}));
 ok('①移したあと localStorage から消える', m1.lsZ===null&&m1.lsC===null, JSON.stringify({z:!!m1.lsZ,c:!!m1.lsC}));
 ok('①カードの写真と写真タブ（図面の2枚）が出る', m1.card&&m1.tab>=2, JSON.stringify({card:m1.card,tab:m1.tab}));
 /* ③ 一覧カードの写真を入れる */
 const c3=await p.evaluate(async()=>{ const pr=props.find(x=>x.code==='J002'); const f=await NOISEFILE(1200,900); nnPhotoFile(pr.id,f);
   await new Promise(r=>setTimeout(r,1500)); const c=await RAWIDB('nn_kirokucho_photo_v1');
   return {idb:!!c.J002, ls:localStorage.getItem('nn_kirokucho_photo_v1')}; });
 ok('③カードの写真は IndexedDB に入り localStorage には書かない', c3.idb&&c3.ls===null, JSON.stringify({idb:c3.idb,ls:!!c3.ls}));
 /* ② 図面で40枚 */
 await p.goto(U+Z); await p.waitForFunction(()=>typeof window.nnSitePhotoPlace==='function'&&window.nnSitePhotoIdb&&nnSitePhotoIdb(),null,{timeout:20000}).catch(()=>{});
 await p.waitForTimeout(800);
 const z2=await p.evaluate(async()=>{ window.confirm=()=>true; let bytes=0;
   for(let i=0;i<40;i++){ nnSitePhotoPlace(2+i%10, 2+Math.floor(i/10), true); const f=await NOISEFILE(1000,750); nnSitePhotoGot(f);
     await new Promise(r=>{ const t0=Date.now(); (function w(){ const d=nnSitePhotoDbg(); if(Object.keys(d.store).length>=i+3||Date.now()-t0>4000) r(); else setTimeout(w,40); })(); }); }
   await new Promise(r=>setTimeout(r,1500));
   const d=nnSitePhotoDbg(); Object.keys(d.store).forEach(k=>bytes+=d.store[k].d.length);
   const z=await RAWIDB('nn_zumen_photos_v1'); return {pins:d.pins.length, idb:Object.keys(z).length, mb:+(bytes/1048576).toFixed(1)}; });
 ok('②40枚撮って合計5MB超でも全部 IndexedDB に入る', z2.pins>=40&&z2.idb>=40&&z2.mb>5, JSON.stringify(z2));
 await p.reload(); await p.waitForFunction(()=>window.nnSitePhotoIdb&&nnSitePhotoIdb(),null,{timeout:20000}).catch(()=>{}); await p.waitForTimeout(600);
 const z3=await p.evaluate(()=>{ const d=nnSitePhotoDbg(); return {pins:d.pins.length, store:Object.keys(d.store).length}; });
 ok('②開き直しても40枚すべて写真つき', z3.pins>=40&&z3.store>=z3.pins, JSON.stringify(z3));
 /* ④ 書き出し・読み込み */
 await p.goto(U+'index.html'); await p.waitForTimeout(800);
 const e4=await p.evaluate(async()=>{ const out=await nnDataMakeAll(); let z={},c={}; try{ z=JSON.parse(out.data.nn_zumen_photos_v1); c=JSON.parse(out.data.nn_kirokucho_photo_v1); }catch(_){}
   return {z:Object.keys(z).length, c:Object.keys(c).length}; });
 ok('④書き出しに図面の写真とカードの写真が入る', e4.z>=40&&e4.c>=2, JSON.stringify(e4));
 const i4=await p.evaluate(async()=>{ window.confirm=()=>true; const d=NOISE(40,30,0.5);
   nnDataApply({kind:'nn_backup',date:'2026-09-29',data:{nn_zumen_photos_v1:JSON.stringify({only1:{d:d,t:1,code:'J9',memo:'x'}})}});
   await window.nnDataApplyWait; const z=await RAWIDB('nn_zumen_photos_v1'); return {n:Object.keys(z).length, has:!!z.only1, ls:localStorage.getItem('nn_zumen_photos_v1')}; });
 ok('④読み込むと写真がファイルの中身に入れ替わる（localStorage には入れない）', i4.n===1&&i4.has&&i4.ls===null, JSON.stringify(i4));
 ok('⑤JSエラーなし', errs.length===0, errs.join(' / ').slice(0,300));
 await b.close(); console.log(R.join('\n'));
})();
