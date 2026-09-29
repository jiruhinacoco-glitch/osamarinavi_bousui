/* ★2026-09-29f 発注のFAX送信を既定で隠す（§544）
   使い方: node _check/faxoff.js [hacchu.html]
   ○/★NG：①既定（未設定）で送信確認に「FAXで送る」が無く、既定FAXの発注先でもメール送信になる
          ②「使う機能」のチェックでFAXが出る・再読み込みでも残る ③チェックを外すと隠れてメールに戻る ④JSエラーなし */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,x)=>R.push((c?'○':'★NG')+' '+n+(x!==undefined?'  '+x:''));
const F=process.argv[2]||'hacchu.html';
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const p=await (await b.newContext({viewport:{width:1300,height:900}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/'+F); await p.evaluate(()=>localStorage.removeItem('nn_feat_fax')); await p.reload();
 await p.waitForFunction(()=>typeof startDraft==='function'&&typeof VENDORS!=='undefined');
 const prev=async()=>p.evaluate(()=>{ const fv=VENDORS.find(v=>v.def==='fax'); showView('new'); draft=null;
   const g=(typeof GENBA!=='undefined'?GENBA:[])[0]; startDraft(g?g.id:undefined); draft.vid=fv.id; draft.via=fv.def; draft.step=3; render();
   const bs=[...document.querySelectorAll('.sendsel button')].map(x=>x.textContent);
   const go=[...document.querySelectorAll('.btn-ok')].map(x=>x.textContent).join('|');
   return {bs, go, via:draft.via}; });
 let r=await prev();
 ok('既定：送信方法にFAXが無い', !r.bs.some(t=>t.includes('FAX')), r.bs.join('/'));
 ok('既定：FAXが既定の発注先でもメール送信になる', r.via==='mail'&&r.go.includes('メール送信'), r.via+' '+r.go);
 await p.evaluate(()=>{ showView('vend'); });
 const has=await p.evaluate(()=>!!document.getElementById('nnFaxOn')); ok('「使う機能」にFAXの切り替えがある', has);
 if(has){ await p.click('#nnFaxOn'); await p.reload(); await p.waitForFunction(()=>typeof startDraft==='function');
   r=await prev(); ok('ONにすると再読み込み後もFAXが出る', r.bs.some(t=>t.includes('FAX'))&&r.via==='fax', r.bs.join('/')+' '+r.via);
   await p.evaluate(()=>showView('vend')); await p.click('#nnFaxOn');
   r=await prev(); ok('OFFに戻すとFAXが隠れてメールになる', !r.bs.some(t=>t.includes('FAX'))&&r.via==='mail', r.bs.join('/')+' '+r.via); }
 ok('JSエラーなし', errs.length===0, errs.join(' / ').slice(0,200));
 await b.close(); console.log(R.join('\n'));
})();
