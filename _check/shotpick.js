/* §1045 カメラ・写真台帳：撮った瞬間に部位を選ぶ（本人「写真を撮った瞬間に役物・全景・立上り…を選べたら、勝手に仕分けでき名前も写真の段階で登録できる」）。
   ①撮影（#dbCam）で入れると「この写真は？」が出る（部位14個） ②現場記録帳に役物の明細がある現場なら、その役物の名前も出る（物流センター36行）
   ③作業（施工前）を選んで役物の名前を押す → その写真の部位・作業内容に入る（黒板・台帳の名前）
   ④「部位ごとに並べる」で 全景→立上り→架台… の順に並ぶ（出来上がりの並びを測る） ⑤スマホ・PC で JSエラーなし。
   直す前の版は★NG。使い方: node _check/shotpick.js [camera.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';let NG=0;const ok=(c,m)=>{if(!c)NG++;console.log((c?'○':'★NG')+' '+m);};
const SITE='テスト 石狩湾新港 物流センター 屋上防水改修（役物36種）';
(async()=>{const b=await chromium.launch();
for(const PH of [1,0]){const nm=PH?'スマホ':'PC';
 const ctx=await b.newContext(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',serviceWorkers:'block'}:{viewport:{width:1440,height:900},serviceWorkers:'block'});
 try{
 /* 役物の明細がある現場（testdata/yakumono_1104.json）を端末に入れる */
 const h=await ctx.newPage();h.on('dialog',d=>d.accept());await h.goto('http://localhost:8899/index.html');await h.waitForTimeout(1200);
 await h.evaluate(async()=>{const T=await (await fetch('./testdata/yakumono_1104.json')).json();const P={v:1,add:T.props.map(q=>JSON.stringify(q)),edit:{},del:[]};localStorage.setItem('nn_kirokucho_props_v1',JSON.stringify(P));});await h.close();
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 if(PH) await p.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
 await p.addInitScript(()=>{try{localStorage.removeItem('nn_daicho_pref_v1');}catch(e){}});
 await p.goto('http://localhost:8899/'+F);await p.waitForTimeout(1500);
 await p.locator('.nnEnCard',{hasText:'写真台帳'}).click();await p.waitForTimeout(600);await p.evaluate(()=>window.nnDbReg&&nnDbReg());
 await p.fill('#dbSite',SITE);await p.locator('#dbSite').dispatchEvent('change');await p.waitForTimeout(500);
 const file=async(n,col)=>({name:n,mimeType:'image/png',buffer:Buffer.from((await p.evaluate(col=>{const c=document.createElement('canvas');c.width=800;c.height=600;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,800,600);return c.toDataURL('image/png');},col)).split(',')[1],'base64')});
 const shoot=async(n,col)=>{await p.setInputFiles('#dbCam',[await file(n,col)]);return await p.waitForFunction(()=>!!document.querySelector('#dbShotPick.on'),null,{timeout:8000}).then(()=>true).catch(()=>false);};
 const on1=await shoot('a.png','#6a8fb0');
 const info=await p.evaluate(()=>({main:[...document.querySelectorAll('#dbShotPick .spg.spmain button')].map(b=>b.dataset.p),yk:document.querySelectorAll('#dbShotPick .spg.spyk button').length}));
 ok(on1&&info.main.length===14&&['全景','平場','立上り','パラペット','入隅','出隅','ドレン周り','架台周り','役物'].every(x=>info.main.includes(x)),nm+' ①撮影すると「この写真は？」（部位'+info.main.length+'個）');
 ok(info.yk===36,nm+' ②この現場の役物（記録帳の明細）が出る（'+info.yk+'個）');
 await p.evaluate(()=>{[...document.querySelectorAll('#dbShotPick .spw button')].find(b=>b.dataset.w==='施工前').click();[...document.querySelectorAll('#dbShotPick .spg.spyk button')].find(b=>b.dataset.p==='架台基礎 600角').click();});await p.waitForTimeout(400);
 const t3=await p.evaluate(()=>{const t=[...document.querySelectorAll('#dbGrid .tile')].pop();return {part:t&&t.querySelector('.part').value,work:t&&t.querySelector('.work').value,open:!!document.querySelector('#dbShotPick.on')};});
 ok(t3.part==='架台基礎 600角'&&t3.work==='施工前'&&!t3.open,nm+' ③押した名前が写真の部位・作業内容に入る '+JSON.stringify(t3));
 await shoot('b.png','#8a6a50');await p.evaluate(()=>[...document.querySelectorAll('#dbShotPick .spg.spmain button')].find(b=>b.dataset.p==='全景').click());await p.waitForTimeout(400);
 await shoot('c.png','#507050');await p.evaluate(()=>[...document.querySelectorAll('#dbShotPick .spg.spmain button')].find(b=>b.dataset.p==='立上り').click());await p.waitForTimeout(400);
 await p.click('#dbByPart');await p.waitForTimeout(500);
 const ord=await p.evaluate(()=>[...document.querySelectorAll('#dbGrid .tile .part')].map(i=>i.value));
 ok(JSON.stringify(ord)===JSON.stringify(['全景','立上り','架台基礎 600角']),nm+' ④部位ごとに並べる '+JSON.stringify(ord));
 ok(!errs.length,nm+' ⑤JSエラーなし '+JSON.stringify(errs.slice(0,2)));
 }catch(e){ ok(false,nm+' 途中で止まった（'+String(e.message).split('\n')[0].slice(0,100)+'）'); }
 await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
