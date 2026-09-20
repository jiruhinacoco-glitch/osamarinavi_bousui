/* バックアップの促し（黄色い帯）＝2026-09-21b から「出さない」仕様。
   仕組みは index.html に残してあり、NN_BKNAG_OFF の1行を消せば元に戻る。
   この検査は「どんな条件でも帯が出ない」ことと「戻せる形で残っている」ことを見る。 */
const fs=require('fs');
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
// ① データが無い＝出ない
await p.goto('http://localhost:8899/index.html'); await p.waitForTimeout(1600);
ok(await p.evaluate(()=>!document.getElementById('nnBkNag')),'データが無いときは出ない');
// ② データがある＆バックアップ記録なし（前は出ていた条件）でも出ない
await p.evaluate(()=>{ localStorage.removeItem('nn_bk_snooze'); localStorage.removeItem('nn_bk_last');
  localStorage.setItem('nn_kirokucho_def_v1','{}'); });
await p.reload(); await p.waitForTimeout(1600);
ok(await p.evaluate(()=>!document.getElementById('nnBkNag')),'データあり＆30日以上バックアップ無しでも出ない');
// ③ 古い「あとで」の記録が切れていても出ない
await p.evaluate(()=>{ localStorage.setItem('nn_bk_snooze', String(Date.now()-30*864e5)); });
await p.reload(); await p.waitForTimeout(1600);
ok(await p.evaluate(()=>!document.getElementById('nnBkNag')),'「あとで」の期限切れでも出ない');
// ④ 戻せる形で仕組みが残っている（1行消せば復活する）
const src=fs.readFileSync('index.html','utf8');
ok(/NN_BKNAG_OFF/.test(src),'戻すための目印 NN_BKNAG_OFF がある');
ok(src.indexOf("id='nnBkNag'")>=0||src.indexOf('id=\"nnBkNag\"')>=0||/nnBkNag/.test(src),'促しの仕組み自体は残してある');
// ⑤ 全ページ共通の型・JSエラー
ok(await p.evaluate(()=>!!document.getElementById('nn-persist-js')),'persist の頼みが入っている（全ページ共通の型）');
ok(errs.length===0,'JSエラーなし',errs);
await b.close(); process.exit(ng?1:0);
})();
