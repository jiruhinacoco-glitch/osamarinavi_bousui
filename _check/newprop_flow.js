/* デバッグ巡回（2026-10-31）：新規物件→図面→記録帳の流れで見つけた不具合の検査。node _check/newprop_flow.js
   ①記録帳の工法に国交省仕様（熱工法 C-1・D-1 など）がある ②熱工法の「露出密着」が熱工法の絵になる
   ③新しい物件の番号が見本の番号（J101〜J109）とぶつからない ④図面・積算の保存で新しい物件を選べる
   ⑤図面・積算の「新規防水」の一覧が上の帯の下に潜らない ⑥作成図面の欄から入れた画像は図面として保管 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(t,c,d)=>{ console.log((c?'○ ':'★NG ')+t+(c?'':' '+JSON.stringify(d))); if(!c)ng++; };
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
 await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','pc')}catch(_){}});
 const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2000);
 const ko=await p.evaluate(()=>Object.keys(KO_MASTER));
 ok('①工法に国交省の熱工法（C-1・D-1）・塩ビ S-F1・X-1H がある', ko.some(k=>/\(C-1\)$/.test(k))&&ko.some(k=>/\(D-1（部分粘着）\)$/.test(k))&&ko.some(k=>/\(S-F1\)$/.test(k))&&ko.some(k=>/\(X-1H\)$/.test(k)), ko.length);
 ok('①今までの10種類は残る', ['ウレタン塗膜 通気緩衝工法(X-1)','改質アスファルト 常温粘着工法(AS-J1)','FRP防水(L-FF)'].every(k=>ko.includes(k)));
 const key=await p.evaluate(()=>nnKouKey({kouhou:'アスファルト防水 熱工法 露出密着(C-1)'}).key);
 ok('②熱工法の露出密着は熱工法の絵（ウレタン密着ではない）', key==='netsu', key);
 /* ③新しい物件を1件作る */
 await p.evaluate(()=>{ showView('list'); openModal(); }); await p.waitForTimeout(600);
 await p.fill('#f_name','検査用 新規物件'); await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='保存する'&&x.offsetParent); b.click(); }); await p.waitForTimeout(900);
 const c=await p.evaluate(()=>{ const n=props.find(x=>x.name==='検査用 新規物件'); const codes=props.map(x=>x.code); return {code:n&&n.code, dup:codes.filter((x,i)=>codes.indexOf(x)!==i)}; });
 ok('③新しい物件の番号がほかとぶつからない', c.code&&!c.dup.length&&!/^J10[1-9]$/.test(c.code), c);
 /* ④図面・積算の保存で選べる */
 await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(2000);
 const bl=await p.evaluate(code=>nnBukkenList().some(x=>x.code===code&&x.name==='検査用 新規物件'), c.code);
 ok('④図面・積算の保存の物件一覧に新しい物件が出る', bl, c.code);
 /* ⑤新規防水の一覧 */
 await p.evaluate(()=>{ try{nnZMenuOpen();}catch(_){} }); await p.waitForTimeout(400);
 await p.locator('#nnZMenu .zmPk[data-pick="zu"]').click(); await p.waitForTimeout(600);
 await p.locator('#nnZMenu .zmCard[data-card="zu"] .zmDd[data-set="sp"]').click(); await p.waitForTimeout(400);
 const dd=await p.evaluate(()=>({m:document.getElementById('zmDdMenu').getBoundingClientRect().top, h:document.querySelector('header').getBoundingClientRect().bottom}));
 ok('⑤新規防水の一覧は上の帯の下から開く（いちばん上の行も押せる）', dd.m>=dd.h-1, dd);
 /* ⑥作成図面の欄から入れた画像 */
 await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2000);
 const pid=await p.evaluate(()=>props.find(x=>x.name==='検査用 新規物件').id);
 await p.evaluate(pid=>{ selectedId=pid; curTab='作成図面'; showView('list'); openDetailFull(); },pid); await p.waitForTimeout(800);
 const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:5000}), p.click('#dz .pick')]);
 await fc.setFiles([{name:'roof.png',mimeType:'image/png',buffer:Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000','hex')}]); await p.waitForTimeout(1200);
 const f=await p.evaluate(pid=>props.find(x=>x.id===pid).files.map(x=>x.cat+':'+x.name),pid);
 ok('⑥作成図面の欄から入れた画像は図面として保管', f.includes('zumen:roof.png'), f);
 /* ⑧カメラの「現場記録帳から引用」に新しい物件が出る */
 await p.goto('http://localhost:8899/camera.html'); await p.waitForTimeout(1800);
 await p.evaluate(()=>{ try{ nnDaichoOpen(); }catch(_){} }); await p.waitForTimeout(800);
 await p.evaluate(()=>{ const b=document.getElementById('dbFromBk'); b&&b.click(); }); await p.waitForTimeout(1200);
 const cam=await p.evaluate(()=>{ const l=document.getElementById('dbBkL'); return l?/検査用 新規物件/.test(l.textContent):'一覧なし'; });
 ok('⑧カメラの「現場記録帳から引用」に新しい物件が出る', cam===true, cam);
 /* ⑨熱工法は工法の分類「熱アス」（改質アスではない） */
 await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(1500);
 ok('⑨熱工法の物件は工法の分類「熱アス」', await p.evaluate(()=>HOU_MAP('アスファルト防水 熱工法 露出絶縁(D-1（部分粘着）)')==='熱アス' && HOU_MAP('改質アスファルトシート トーチ工法(AS-T1)')==='改質アス'));
 /* ⑪ダッシュボードの工法別の絵（熱アスも絵がある） */
 const hi=await p.evaluate(async()=>{ const r=await fetch('./icons/'+HOU_IMG['熱アス']+'.png'); return HOU_IMG['熱アス']+':'+r.status; });
 ok('⑪ダッシュボードの工法別：熱アスの絵がある', /:200$/.test(hi), hi);
 const kept=await p.evaluate(()=>{ const q=props.find(x=>/熱工法/.test(x.kouhou||'')); return q?q.hou:'(熱工法の物件なし)'; });
 /* ⑩きく：新しい物件の項目に答える（物件名の「アス」で材料の単価に化けない） */
 await p.goto('http://localhost:8899/index.html'); await p.waitForTimeout(800);   /* ★記録帳を開いたまま書き換えると、離れるときに記録帳が元の中身で保存し直す */
 await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('nn_kirokucho_props_v1')); const i=d.add.findIndex(t=>JSON.parse(t).name==='検査用 新規物件'); const q=JSON.parse(d.add[i]); q.name='検査熱アス物件'; q.cbD={__d:'2026-11-10T00:00:00.000Z'}; d.add[i]=JSON.stringify(q); localStorage.setItem('nn_kirokucho_props_v1',JSON.stringify(d));
   localStorage.setItem('nn_hacchu_hist',JSON.stringify([{id:'h1',gid:'J051',vid:'v1',date:'2026-07-08',via:'fax',no:'X',lines:[{n:'アスファルトプライマー',sp:'',u:'缶',p:9500,q:1}]}])); });
 await p.goto('http://localhost:8899/index.html'); await p.waitForTimeout(1500);
 await p.evaluate(()=>nnAskOpen()); await p.waitForTimeout(800);
 await p.fill('#nnAskIn','検査熱アス物件の着工日は？'); await p.click('#nnAskGo'); await p.waitForTimeout(1200);
 const ans=await p.evaluate(()=>{ const c=document.querySelector('#nnAskBody > *'); return c?c.innerText.replace(/\s+/g,' '):''; });
 ok('⑩きく：新しい物件の着工日に答える（材料の単価に化けない）', /着工/.test(ans)&&/11月10日/.test(ans)&&!/プライマー/.test(ans), ans.slice(0,120));
 /* ⑫図面を物件に紐づけたら、見積書の宛先・件名・工事場所はその物件（記録帳の「見積書」＝窓を通らない呼び方でも） */
 await p.goto('http://localhost:8899/index.html'); await p.waitForTimeout(600);
 const pc=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('nn_kirokucho_props_v1')); const i=d.add.findIndex(t=>/検査/.test(JSON.parse(t).name)); const q=JSON.parse(d.add[i]); q.moto='検査元請建設（株）'; q.addr='札幌市検査区1-1'; d.add[i]=JSON.stringify(q); localStorage.setItem('nn_kirokucho_props_v1',JSON.stringify(d));
   localStorage.setItem('nn_zumen_cur',JSON.stringify({id:'sx',name:q.name,code:q.code})); return {code:q.code,name:q.name}; });
 await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1800);
 await p.evaluate(()=>{ const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]; state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}]; });
 const [mp]=await Promise.all([ctx.waitForEvent('page',{timeout:6000}).catch(()=>null), p.evaluate(()=>nnMitsuPDF())]);
 const mt=mp?await mp.evaluate(()=>document.body.innerText.replace(/\s+/g,' ')):'';
 ok('⑫紐づいた物件の元請・物件名・住所が見積書に入る（「— 御中」にならない）', /検査元請建設（株） 御中/.test(mt)&&mt.includes('件 名 '+pc.name)&&/札幌市検査区1-1/.test(mt), mt.slice(0,160));
 if(mp) await mp.close();
 const [pp]=await Promise.all([ctx.waitForEvent('page',{timeout:6000}).catch(()=>null), p.evaluate(()=>nnPlanPDF())]);
 const pt=pp?await pp.evaluate(()=>document.body.innerText.replace(/\s+/g,' ')):'';
 ok('⑬平面図の表題欄の工事名称・場所・元請に紐づいた物件', pt.includes('工事名称 '+pc.name)&&/場 所 札幌市検査区1-1/.test(pt)&&/元請：検査元請建設/.test(pt), (pt.match(/工事名称[^]{0,40}/)||[''])[0]);
 if(pp) await pp.close();
 /* ⑭番号がぶつかっていた物件（J101）の写真・書類は、付け直した番号へ一緒に移る（見本の J101 に付かない） */
 const c3=await b.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
 const r3=await c3.newPage(); r3.on('dialog',d=>d.accept());
 await r3.goto('http://localhost:8899/index.html'); await r3.waitForTimeout(800);
 await r3.evaluate(async()=>{ localStorage.setItem('nn_view_mode','pc');
   localStorage.setItem('nn_kirokucho_props_v1',JSON.stringify({v:1,seq:101,add:[JSON.stringify({id:101,code:'J101',name:'旧番号の物件',status:'契約済',kouhou:'ウレタン塗膜 通気緩衝工法(X-1)',m:100,un:'㎡',jinku:[],extras:[]})],edit:{},del:[]}));
   await new Promise((res,rej)=>{ const q=indexedDB.open('nn_submission_files_v1',1); q.onupgradeneeded=()=>q.result.createObjectStore('files',{keyPath:'id'});
     q.onsuccess=()=>{ const tx=q.result.transaction('files','readwrite'); tx.objectStore('files').put({id:'old1',code:'J101',name:'old.jpg',size:3,cat:'photo',docKind:'',date:'2026/10/31',blob:new Blob(['abc'],{type:'image/jpeg'})}); tx.oncomplete=res; tx.onerror=rej; }; q.onerror=rej; }); });
 await r3.goto('http://localhost:8899/kirokucho_demo.html'); await r3.waitForTimeout(2500);
 const mvd=await r3.evaluate(()=>{ const n=props.find(x=>x.name==='旧番号の物件'), s=props.find(x=>x.name!=='旧番号の物件'&&x.code==='J101');
   return {newCode:n&&n.code, newFiles:n?n.files.map(f=>f.name):[], sampleFiles:s?s.files.map(f=>f.name):[]}; });
 ok('⑭番号を付け直した物件の写真は新しい番号へ移る（見本の J101 に付かない）', mvd.newCode!=='J101'&&mvd.newFiles.includes('old.jpg')&&!mvd.sampleFiles.includes('old.jpg'), mvd);
 await c3.close();
 /* ⑦スマホの作成図面にも「撮る／選ぶ」（スマホは枠が隠れる） */
 const c2=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
 await c2.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(_){}});
 const q=await c2.newPage(); await q.goto('http://localhost:8899/kirokucho_demo.html'); await q.waitForTimeout(2000);
 await q.evaluate(()=>{ selectedId=props[0].id; curTab='作成図面'; showView('list'); openDetailFull(); }); await q.waitForTimeout(800);
 const bt=await q.evaluate(()=>[...document.querySelectorAll('#detail .nnPickBtns button')].filter(e=>e.offsetParent).map(e=>e.textContent.trim()+'|'+e.getAttribute('onclick')));
 ok('⑦スマホの作成図面に「図面を撮る／ファイルを選ぶ」（図面として保管）', bt.length===2&&bt.every(x=>/'zumen'/.test(x)), bt);
 await b.close(); console.log(ng?'★NG '+ng:'全部○');
})();
