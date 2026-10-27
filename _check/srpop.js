/* ★2026-10-27g 本人のスクショ「商流の画面（図）からも任意で入力できたり、プルダウンが出て選べるように。無駄な余白なく、シンプルにデカく表示せずに」
   新規物件登録の「商流」の帯で、図の会社の札を押す → 図のすぐ下に1行（立場の札・名前の欄・候補▼・✓）が出るか。
   ①札を押すと1行が出る（高さ48px以下＝デカくない・押した札に印）
   ②▼で候補をえらぶ → 図の札と下の「会社名」の欄の両方に入る
   ③名前の欄に打つ → 図の札が変わる
   ④別の札を押すと1行がその会社に替わる・✓で閉じる
   ⑤保存すると商流に残る（元請＝図のいちばん上）
   使い方: node _check/srpop.js [kirokucho_demo.html の代わり]（http://localhost:8899 で配信しておくこと）
   スクショ: SHOT=出力.png を付けると、押す前と押した後を並べた1枚を書き出す */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,220):'')); if(!c)NG++;};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(1800);
 await p.evaluate(()=>openModal()); await p.waitForFunction(()=>document.querySelector('#nnSrBand .sr-pv .srn'));
 await p.evaluate(()=>document.getElementById('f_name').value='テスト現場');
 const band=await p.$('#nnSrBand'); await band.scrollIntoViewIfNeeded();
 const shot0=process.env.SHOT?await band.screenshot():null;
 const pill=(t)=>p.evaluate(t=>{ const n=[...document.querySelectorAll('#nnSrBand .sr-pv .srn')].find(n=>n.querySelector('.tt').textContent===t); return n?n.dataset.id:null; },t);
 const mk=await pill('メーカー'), top=await pill('元請');
 ok('（準備）図にメーカーと元請の札がある', !!mk&&!!top, {mk,top});
 /* ① */
 await p.tap('#nnSrBand .sr-pv .srn[data-id="'+mk+'"]'); await p.waitForTimeout(150);
 const s1=await p.evaluate(id=>{ const q=document.querySelector('#nnSrBand .srpop'); if(!q) return null; const r=q.getBoundingClientRect();
   return {id:q.dataset.id, h:Math.round(r.height), inp:!!q.querySelector('input'), opts:q.querySelector('select')?q.querySelector('select').options.length:0,
     sel:!!document.querySelector('#nnSrBand .sr-pv .srn.sel[data-id="'+id+'"]'), under:q.previousElementSibling&&q.previousElementSibling.classList.contains('sr-pv')}; },mk);
 ok('①札を押すと図のすぐ下に1行（名前の欄＋候補▼）が出る', s1&&s1.id===mk&&s1.inp&&s1.opts>1&&s1.under, s1);
 ok('①1行は高さ48px以下（デカくない）・押した札に印', s1&&s1.h<=48&&s1.sel, s1);
 const shot1=process.env.SHOT?await band.screenshot():null;
 /* ② */
 const v2=await p.evaluate(()=>{ const s=document.querySelector('#nnSrBand .srpop select'); return s.options[s.options.length-1].value; });
 await p.selectOption('#nnSrBand .srpop select',v2); await p.waitForTimeout(150);
 const s2=await p.evaluate(id=>({pill:document.querySelector('#nnSrBand .sr-pv .srn[data-id="'+id+'"]').getAttribute('title'),
   list:(document.querySelector('#nnSrBand .nmr[data-id="'+id+'"] input')||{}).value, inp:document.querySelector('#nnSrBand .srpop input').value}),mk);
 ok('②▼でえらぶと、図の札・下の会社名の欄・1行の欄に入る', s2.pill===v2&&s2.list===v2&&s2.inp===v2, {v2,...s2});
 /* ③ */
 await p.fill('#nnSrBand .srpop input','手打ちメーカー'); await p.waitForTimeout(150);
 const s3=await p.evaluate(id=>({pill:document.querySelector('#nnSrBand .sr-pv .srn[data-id="'+id+'"]').getAttribute('title'),
   list:(document.querySelector('#nnSrBand .nmr[data-id="'+id+'"] input')||{}).value}),mk);
 ok('③1行の欄に打つと、図の札と下の欄も変わる', s3.pill==='手打ちメーカー'&&s3.list==='手打ちメーカー', s3);
 /* ④ */
 await p.tap('#nnSrBand .sr-pv .srn[data-id="'+top+'"]'); await p.waitForTimeout(150);
 await p.fill('#nnSrBand .srpop input','テスト元請建設'); await p.waitForTimeout(150);
 const s4=await p.evaluate(()=>({n:document.querySelectorAll('#nnSrBand .srpop').length, id:(document.querySelector('#nnSrBand .srpop')||{}).dataset.id,
   sel:document.querySelectorAll('#nnSrBand .sr-pv .srn.sel').length}));
 ok('④別の札を押すと1行がその会社に替わる（1行だけ・印も1つ）', s4.n===1&&s4.id===top&&s4.sel===1, s4);
 await p.tap('#nnSrBand .srpop [data-pop]'); await p.waitForTimeout(100);
 ok('④✓で閉じる', await p.evaluate(()=>!document.querySelector('#nnSrBand .srpop')&&!document.querySelector('#nnSrBand .sr-pv .srn.sel')));
 /* ⑤ */
 const before=await p.evaluate(()=>props.length);
 await p.evaluate(()=>saveProperty()); await p.waitForTimeout(600);
 const s5=await p.evaluate(n=>{ const q=props.find(x=>x.name==='テスト現場')||{}; return {added:props.length===n+1, moto:q.moto, nms:(q.sr&&q.sr.n||[]).map(x=>x.nm)}; },before);
 ok('⑤保存すると商流に残る（元請＝いちばん上・メーカー＝打った名前）', s5.added&&s5.moto==='テスト元請建設'&&s5.nms.includes('手打ちメーカー'), s5);
 ok('JSエラーなし', errs.length===0, errs.slice(0,3));
 if(process.env.SHOT&&shot0&&shot1){
   const q=await b.newPage({viewport:{width:820,height:900}});
   await q.setContent('<body style="margin:0;background:#2b2b2b;font-family:sans-serif;color:#fff;display:inline-flex;gap:14px;padding:12px;align-items:flex-start">'
     +'<div><div style="font-weight:900;margin:0 0 6px">押す前</div><img style="width:390px" src="data:image/png;base64,'+shot0.toString('base64')+'"></div>'
     +'<div><div style="font-weight:900;margin:0 0 6px">「メーカー」の札を押した後</div><img style="width:390px" src="data:image/png;base64,'+shot1.toString('base64')+'"></div></body>');
   await (await q.$('body')).screenshot({path:process.env.SHOT});
 }
 console.log(NG?('★NG '+NG+'件'):'全部○');
 await b.close();
})();
