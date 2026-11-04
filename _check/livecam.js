/* §1046 カメラ・写真台帳：撮る画面に部位のボタン（本人「写真を撮るこの画面の段階から部位の選択ボタンを付けたい」）。
   iPhone 本体のカメラにはボタンを足せないので、納まりナビの中のカメラ（getUserMedia）。検査は Chromium のにせカメラで流す。
   ①「撮影」で中のカメラが開き映像が出る（部位14個・作業3つ・シャッター）
   ②施工前・立上り を選んで2枚 → 役物の一覧から1つ選んで1枚 → 閉じると一覧に3枚・部位と作業内容が付いている（出来上がり）
   ③閉じるとカメラが止まる ④スマホ・PC で JSエラーなし。直す前の版は★NG。使い方: node _check/livecam.js [camera.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'camera.html';let NG=0;const ok=(c,m)=>{if(!c)NG++;console.log((c?'○':'★NG')+' '+m);};
const SITE='テスト 石狩湾新港 物流センター 屋上防水改修（役物36種）';
(async()=>{const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
for(const PH of [1,0]){const nm=PH?'スマホ':'PC';
 const ctx=await b.newContext(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',serviceWorkers:'block',permissions:['camera']}:{viewport:{width:1440,height:900},serviceWorkers:'block',permissions:['camera']});
 try{
 const h=await ctx.newPage();await h.goto('http://localhost:8899/index.html');await h.waitForTimeout(1000);
 await h.evaluate(async()=>{const T=await (await fetch('./testdata/yakumono_1104.json')).json();localStorage.setItem('nn_kirokucho_props_v1',JSON.stringify({v:1,add:T.props.map(q=>JSON.stringify(q)),edit:{},del:[]}));});await h.close();
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 if(PH) await p.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
 await p.addInitScript(()=>{try{localStorage.removeItem('nn_daicho_pref_v1');}catch(e){}});
 await p.goto('http://localhost:8899/'+F);await p.waitForTimeout(1500);
 await p.locator('.nnEnCard',{hasText:'写真台帳'}).click();await p.waitForTimeout(600);await p.evaluate(()=>window.nnDbReg&&nnDbReg());
 await p.fill('#dbSite',SITE);await p.locator('#dbSite').dispatchEvent('change');await p.waitForTimeout(500);
 await p.evaluate(()=>document.getElementById('dbShoot').click());
 const live=await p.waitForFunction(()=>{const v=document.querySelector('#dbLive.on video');return v&&v.videoWidth>0;},null,{timeout:8000}).then(()=>true).catch(()=>false);
 const u=await p.evaluate(()=>({parts:document.querySelectorAll('#dbLive .lvparts button').length,works:document.querySelectorAll('#dbLive .lvwork button').length,shut:!!document.querySelector('#dbLive .lvshut')}));
 ok(live&&u.parts===14&&u.works===3&&u.shut,nm+' ①撮影で中のカメラが開く・映像が出る '+JSON.stringify(u));
 const click=(sel,key,val)=>p.evaluate(([sel,key,val])=>{const b=[...document.querySelectorAll(sel)].find(b=>b.dataset[key]===val);if(!b)throw new Error('ボタンなし '+val);b.click();},[sel,key,val]);
 const shut=async()=>{await p.evaluate(()=>document.querySelector('#dbLive .lvshut').click());await p.waitForTimeout(600);};
 await click('#dbLive .lvwork button','w','施工前');await click('#dbLive .lvparts button','p','立上り');await shut();await shut();
 await click('#dbLive .lvparts button','p','役物');await click('#dbLive .lvykg button','p','架台基礎 600角');await shut();
 await p.waitForFunction(()=>document.querySelectorAll('#dbGrid .tile').length>=3,null,{timeout:8000}).catch(()=>{});
 await p.evaluate(()=>document.querySelector('#dbLive .lvx').click());await p.waitForTimeout(500);
 const r=await p.evaluate(()=>({tiles:[...document.querySelectorAll('#dbGrid .tile')].map(t=>t.querySelector('.part').value+'/'+t.querySelector('.work').value),open:!!document.querySelector('#dbLive.on'),stopped:!(document.querySelector('#dbLive video')||{}).srcObject}));
 ok(JSON.stringify(r.tiles)===JSON.stringify(['立上り/施工前','立上り/施工前','架台基礎 600角/施工前']),nm+' ②撮った3枚に部位・作業内容が付いて一覧に入る '+JSON.stringify(r.tiles));
 ok(!r.open&&r.stopped,nm+' ③閉じるとカメラが止まる');
 ok(!errs.length,nm+' ④JSエラーなし '+JSON.stringify(errs.slice(0,2)));
 }catch(e){ ok(false,nm+' 途中で止まった（'+String(e.message).split('\n')[0].slice(0,100)+'）'); }
 await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
