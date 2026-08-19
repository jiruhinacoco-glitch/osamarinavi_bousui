/* 役物（ドレン・脱気筒・笠木…）が 全削除／🗑削除／範囲選択／選択 で消せるか（2026-08-19f） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1600,height:900}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1600);
await p.evaluate(()=>{ try{ localStorage.removeItem('nn_zumen_v1'); }catch(_){} });
await p.reload({waitUntil:'load'});
await p.waitForTimeout(1800);

const place=async(key,gx,gy)=>p.evaluate(([k,x,y])=>{ nnStamp(k); nnPlaceAtGrid(x,y); }, [key,gx,gy]);
const cnt=()=>p.evaluate(()=>window.nnPartsCount?nnPartsCount():-1);

/* ① 選択ツールで選んで 🗑削除 */
await place('dakki', 3, 3); await p.waitForTimeout(200);
ok(await cnt()===1,'役物を1つ置ける',await cnt());
await p.evaluate(()=>setTool('sel'));
const hit=await p.evaluate(()=>{
  const cv=document.getElementById('cv'), r=cv.getBoundingClientRect();
  /* 図面座標(3,3) の画面位置 */
  const kx=(cv.width/devicePixelRatio)/r.width;
  return {x:r.left+(ox+3*cellPx)/kx, y:r.top+(oy+3*cellPx)/kx};
});
await p.mouse.click(hit.x, hit.y); await p.waitForTimeout(300);
ok(await p.evaluate(()=>nnPartSelIdx())===0,'「選択」ツールでタップすると選べる',await p.evaluate(()=>nnPartSelIdx()));
await p.evaluate(()=>smartDelete()); await p.waitForTimeout(300);
ok(await cnt()===0,'🗑削除で消える',await cnt());

/* ② 範囲選択でまとめて消す */
await place('tatedrain', 5, 5); await place('yokodrain', 6, 5); await place('kasagi', 7, 5);
await p.waitForTimeout(200);
ok(await cnt()===3,'役物を3つ置ける',await cnt());
await p.evaluate(()=>setTool('rect'));
const box=await p.evaluate(()=>{
  const cv=document.getElementById('cv'), r=cv.getBoundingClientRect();
  const kx=(cv.width/devicePixelRatio)/r.width;
  const P=(gx,gy)=>({x:r.left+(ox+gx*cellPx)/kx, y:r.top+(oy+gy*cellPx)/kx});
  return {a:P(4,4), b:P(8,6)};
});
await p.mouse.move(box.a.x, box.a.y); await p.mouse.down();
await p.mouse.move(box.b.x, box.b.y, {steps:8}); await p.mouse.up(); await p.waitForTimeout(400);
const selN=await p.evaluate(()=>psel.length);
ok(selN===3,'範囲選択で役物3つが選ばれる',selN);
ok(await p.evaluate(()=>document.getElementById('tl_rdel').style.display!=='none'),'「選択を削除」ボタンが出る');
await p.evaluate(()=>rectDelete()); await p.waitForTimeout(300);
ok(await cnt()===0,'範囲選択→削除で消える',await cnt());

/* ③ Deleteキーでも消える */
await place('dakki', 4, 8); await place('dakki', 5, 8); await p.waitForTimeout(200);
await p.evaluate(()=>setTool('rect'));
const box2=await p.evaluate(()=>{
  const cv=document.getElementById('cv'), r=cv.getBoundingClientRect();
  const kx=(cv.width/devicePixelRatio)/r.width;
  const P=(gx,gy)=>({x:r.left+(ox+gx*cellPx)/kx, y:r.top+(oy+gy*cellPx)/kx});
  return {a:P(3,7), b:P(6,9)};
});
await p.mouse.move(box2.a.x, box2.a.y); await p.mouse.down();
await p.mouse.move(box2.b.x, box2.b.y, {steps:8}); await p.mouse.up(); await p.waitForTimeout(350);
await p.keyboard.press('Delete'); await p.waitForTimeout(350);
ok(await cnt()===0,'Deleteキーでも消える',await cnt());

/* ④ 全削除で役物も消える（部位が0面でも） */
await place('hikomi', 4, 4); await place('oshidashi', 5, 4); await p.waitForTimeout(200);
ok(await p.evaluate(()=>state.polys.length)===0,'部位は0面のまま');
await p.evaluate(()=>clearAll()); await p.waitForTimeout(400);
ok(await cnt()===0,'部位が0面でも「全削除」で役物が消える',await cnt());

/* ⑤ 部位と役物が両方あるときも全削除で両方消える */
await p.evaluate(()=>{ const b=document.getElementById('tl_sample'); if(b)b.click(); }); await p.waitForTimeout(800);
await place('dakki', 4, 4); await p.waitForTimeout(200);
const before=await p.evaluate(()=>({q:state.polys.length,p:nnPartsCount()}));
ok(before.q>0&&before.p>0,'部位と役物が両方ある',before);
await p.evaluate(()=>clearAll()); await p.waitForTimeout(500);
const after=await p.evaluate(()=>({q:state.polys.length,p:nnPartsCount()}));
ok(after.q===0&&after.p===0,'全削除で両方消える',after);

/* ⑥ 再読み込みしても消えたまま（保存されている） */
await p.reload({waitUntil:'load'}); await p.waitForTimeout(1800);
ok(await cnt()===0,'再読み込みしても消えたまま',await cnt());
ok(errs.length===0,'JSエラーなし',errs);
await b.close(); process.exit(ng?1:0);
})();
