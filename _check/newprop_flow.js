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
 /* ⑦スマホの作成図面にも「撮る／選ぶ」（スマホは枠が隠れる） */
 const c2=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
 await c2.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(_){}});
 const q=await c2.newPage(); await q.goto('http://localhost:8899/kirokucho_demo.html'); await q.waitForTimeout(2000);
 await q.evaluate(()=>{ selectedId=props[0].id; curTab='作成図面'; showView('list'); openDetailFull(); }); await q.waitForTimeout(800);
 const bt=await q.evaluate(()=>[...document.querySelectorAll('#detail .nnPickBtns button')].filter(e=>e.offsetParent).map(e=>e.textContent.trim()+'|'+e.getAttribute('onclick')));
 ok('⑦スマホの作成図面に「図面を撮る／ファイルを選ぶ」（図面として保管）', bt.length===2&&bt.every(x=>/'zumen'/.test(x)), bt);
 await b.close(); console.log(ng?'★NG '+ng:'全部○');
})();
