/* ★2026-10-10d 新規現場作成の改良6点（本人「全部対応して」・§626）
   ①下書きに商流の形も残る（閉じて開き直しても 3次請・手間請け のまま）
   ②会社名が空の会社があると保存を止めて知らせる（見本の文字のまま保存しない）
   ③元請が客先登録に無ければ、保存の後に「客先に登録」を出す（押すと新規顧客登録が会社名入りで開く）
   ④前の現場から作る：商流（会社名まで）・仕様を写し、工事名・住所はそのまま、面積は空
   ⑤ステータスが契約済・施工中・完成済なら 契約日・請負額 も必須（橙）・空だと止める
   ⑥工事名か住所がほぼ同じ現場があれば確認（やめる＝登録しない／登録する＝登録）
   使い方: node _check/shinki2.js [kirokucho_demo.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,220):'')); if(!c)NG++;};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 try{
 await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(1800);
 const sel=async(q,v)=>p.selectOption(`#nnSrBand select[data-q=${q}]`,v);
 const nms=()=>p.evaluate(()=>[...document.querySelectorAll('#nnSrBand .nmr input')].map(i=>i.value));
 const count=()=>p.evaluate(()=>props.length);
 /* ① 下書き */
 await p.evaluate(()=>openModal()); await p.waitForTimeout(600);
 await p.fill('#f_name','下書きテスト現場'); await sel('pos','3'); await sel('k','手間請け'); await p.waitForTimeout(100);
 await p.fill('#nnSrBand .nmr >> nth=0 >> input','岩田地崎建設'); await p.waitForTimeout(700);
 await p.evaluate(()=>nnDraftSaveClose()); await p.waitForTimeout(300);
 await p.evaluate(()=>openModal()); await p.waitForTimeout(700);
 const d1=await p.evaluate(()=>({pos:document.querySelector('#nnSrBand select[data-q=pos]').value, k:document.querySelector('#nnSrBand select[data-q=k]').value, top:document.querySelector('#nnSrBand .nmr input').value, name:document.getElementById('f_name').value}));
 ok('①下書き：閉じて開き直しても商流の形（3次請・手間請け）と元請が戻る', d1.pos==='3'&&d1.k==='手間請け'&&d1.top==='岩田地崎建設'&&d1.name==='下書きテスト現場', d1);
 /* ② 会社名が空 */
 const n0=await count();
 await p.evaluate(()=>saveProperty()); await p.waitForTimeout(400);
 const e2=await p.evaluate(()=>({open:document.getElementById('modalbg').classList.contains('open'), err:document.querySelector('#nnSrBand .sr-err').textContent, emp:document.querySelectorAll('#nnSrBand .nmr.emp').length}));
 ok('②足した会社（1次・2次請など）の名前が空だと保存しない・何が空か知らせる・空の欄を赤く（元請は任意のまま）', e2.open&&/会社名が空/.test(e2.err)&&e2.emp>=1&&(await count())===n0, e2);
 const saved2=await p.evaluate(()=>props.some(x=>x.sr&&x.sr.n.some(n=>/上の請負の会社|元請の会社/.test(n.nm))));
 ok('②見本の文字（上の請負の会社 など）のまま保存された会社は無い', !saved2);
 /* 名前を全部入れて保存 → ③客先 */
 const L=await nms(); for(let i=0;i<L.length;i++){ if(!L[i]) await p.fill(`#nnSrBand .nmr >> nth=${i} >> input`,'テスト会社'+i); }
 await p.evaluate(()=>saveProperty()); await p.waitForTimeout(600);
 const s3=await p.evaluate(()=>({open:document.getElementById('modalbg').classList.contains('open'), bar:(document.getElementById('nnSrBar')||{}).className||'', txt:(document.getElementById('nnSrBar')||{}).textContent||'', draft:localStorage.getItem('nn_kirokucho_draft_v1')}));
 ok('③名前を入れれば保存できる・元請（客先に未登録）なら「客先に登録」が下に出る', !s3.open&&/on/.test(s3.bar)&&/岩田地崎建設/.test(s3.txt), s3);
 ok('①保存したら下書きは消える', !s3.draft, s3.draft&&s3.draft.slice(0,60));
 await p.click('#nnSrBar .ok'); await p.waitForTimeout(400);
 const c3=await p.evaluate(()=>{ const n=document.getElementById('rg_name'); return n?{name:n.value, vis:!!n.offsetParent}:null; });
 ok('③「客先に登録」を押すと新規顧客登録が会社名入りで開く', c3&&c3.vis&&c3.name==='岩田地崎建設', c3);
 await p.evaluate(()=>{ window.nnMaster&&nnMaster.close(); });
 /* ⑥ 似た現場 */
 await p.evaluate(()=>openModal()); await p.waitForTimeout(600);
 await p.fill('#f_name','下書きテスト現場'); await p.fill('#nnSrBand .nmr >> nth=0 >> input','丸彦渡辺建設');
 const n6=await count(); await p.evaluate(()=>saveProperty()); await p.waitForTimeout(400);
 const a6=await p.evaluate(()=>({ask:(document.getElementById('nnSrAsk')||{}).className||'', txt:(document.getElementById('nnSrAsk')||{}).textContent||''}));
 ok('⑥工事名が同じ現場があると「似た現場」の確認が出る（まだ登録しない）', /on/.test(a6.ask)&&/下書きテスト現場/.test(a6.txt)&&(await count())===n6, a6);
 await p.click('#nnSrAsk .ng'); await p.waitForTimeout(300);
 ok('⑥「やめる」なら登録しない（窓は開いたまま）', (await count())===n6&&await p.evaluate(()=>document.getElementById('modalbg').classList.contains('open')));
 await p.evaluate(()=>saveProperty()); await p.waitForTimeout(300); await p.click('#nnSrAsk .ok'); await p.waitForTimeout(600);
 ok('⑥「登録する」なら登録される', (await count())===n6+1);
 /* ⑤ ステータスで必須 */
 await p.evaluate(()=>openModal()); await p.waitForTimeout(600);
 await p.fill('#f_name','必須テスト現場'); await p.fill('#nnSrBand .nmr >> nth=0 >> input','丸彦渡辺建設');
 await p.selectOption('#f_st','契約済'); await p.waitForTimeout(150);
 const r5=await p.evaluate(()=>({kb:document.getElementById('f_kb').classList.contains('nnReq'), amt:document.getElementById('f_amt').classList.contains('nnReq'), bg:getComputedStyle(document.getElementById('f_kb')).backgroundColor}));
 ok('⑤契約済にすると 契約日・請負額 が必須の色（橙）になる', r5.kb&&r5.amt&&r5.bg==='rgb(255, 244, 224)', r5);
 const n5=await count(); await p.evaluate(()=>saveProperty()); await p.waitForTimeout(400);
 ok('⑤空のままだと保存しない', (await count())===n5&&await p.evaluate(()=>document.getElementById('modalbg').classList.contains('open')));
 await p.fill('#f_kb','2026-10-01'); await p.fill('#f_amt','1200000'); await p.evaluate(()=>saveProperty()); await p.waitForTimeout(600);
 ok('⑤入れれば保存できる', (await count())===n5+1);
 await p.selectOption('#f_st','引合いあり').catch(()=>{});
 await p.evaluate(()=>openModal()); await p.waitForTimeout(500);
 ok('⑤引合いありなら必須にしない', await p.evaluate(()=>!document.getElementById('f_kb').classList.contains('nnReq')));
 /* ④ 前の現場から */
 const src=await p.evaluate(()=>{ const q=props.find(x=>x.name==='下書きテスト現場'&&x.sr&&x.moto==='岩田地崎建設'); return {id:q.id, top:q.sr.n.find(n=>n.pid==null).nm}; });
 await p.fill('#f_name','写しテスト現場'); await p.fill('#f_addr','札幌市西区写し1条1丁目');
 await p.click('#nnSrBand [data-copy]'); await p.waitForTimeout(200);
 const items=await p.evaluate(()=>document.querySelectorAll('#nnSrPick.on .ls button').length);
 await p.fill('#nnSrPick input','下書きテスト'); await p.waitForTimeout(100);
 await p.click(`#nnSrPick .ls button[data-id="${src.id}"]`); await p.waitForTimeout(700);
 const c4=await p.evaluate(()=>({name:document.getElementById('f_name').value, addr:document.getElementById('f_addr').value, pos:document.querySelector('#nnSrBand select[data-q=pos]').value, k:document.querySelector('#nnSrBand select[data-q=k]').value, top:document.querySelector('#nnSrBand .nmr input').value, moto:document.getElementById('f_moto').value}));
 ok('④前の現場から：一覧から選ぶと商流（3次請・手間請け・元請）が写り、工事名・住所はそのまま', items>3&&c4.name==='写しテスト現場'&&c4.addr==='札幌市西区写し1条1丁目'&&c4.pos==='3'&&c4.k==='手間請け'&&c4.top===src.top&&c4.moto===src.top, c4);
 ok('④新規のときだけ「前の現場から」がある（編集では出ない）', await p.evaluate(()=>{ const a=!!document.querySelector('#nnSrBand [data-copy]').offsetParent; openModal(props[0].id); const e=!!document.querySelector('#nnSrBand [data-copy]').offsetParent; closeModal(); return a&&!e; }));
 const M=await p.evaluate(()=>{ closeModal(); nnDraftClear(); openModal(); const m=document.querySelector('#modalbg .modal'); return m.scrollHeight>m.clientHeight+1; });
 ok('パソコン：いつもの新規（下書きなし）なら登録の窓はスクロールなしの1画面のまま', !M);
 ok('JSエラーなし', !errs.length, errs.slice(0,3));
 }catch(e){ ok('実行エラー '+e.message.slice(0,160), false); }
 await b.close(); console.log(NG?'★NG '+NG+'件':'全部○');
})();
