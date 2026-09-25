/* ★2026-09-25t 新規物件登録：「新規防水＝平場」が見て分かるか（本人「右の説明文字は見ない」）
   ① 平場の行が青で囲われ、新規防水の絵から線でつながっている
   ② 平場のボタンに新規防水と同じ絵が出ている
   ③ ほかの部位：同じ工法のあいだは「同じ」（薄い絵）／別の工法を選ぶと「別」（オレンジ）に変わる
   ④ 小さい説明文字「他の部位も同じ…」が無い
   使い方：node _check/regv5.js [ファイル名]（http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const exe=fs.readdirSync('/opt/pw-browsers').filter(d=>d.startsWith('chromium-')).map(d=>'/opt/pw-browsers/'+d+'/chrome-linux/chrome')[0];
const file=process.argv[2]||'kirokucho_demo.html';
let ng=0; const ok=(c,m,x)=>{ console.log((c?'○ ':'★NG ')+m+(x?'  '+x:'')); if(!c) ng++; };
(async()=>{const b=await chromium.launch({executablePath:exe});
for(const ph of [0,1]){
const ctx=await b.newContext(ph?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',serviceWorkers:'block'}:{viewport:{width:1400,height:900},serviceWorkers:'block'});
const p=await ctx.newPage(); const T=ph?'スマホ ':'PC ';
await p.goto('http://localhost:8899/'+file); await p.waitForTimeout(1200);
await p.evaluate(()=>openModal()); await p.waitForTimeout(500);
const r=await p.evaluate(()=>{const rf=document.querySelector('#f_kouji .rf'); const arr=[...rf.querySelectorAll('.arr')];
  const hira=arr.find(a=>a.dataset.k==='平場'), tate=arr.find(a=>a.dataset.k==='立上り');
  const cs=getComputedStyle(hira), bf=getComputedStyle(hira,'::before');
  const img=rf.querySelector('.rfk').parentNode.querySelector('img');
  const ir=img.getBoundingClientRect(), hr=hira.getBoundingClientRect();
  const kb=hira.querySelector('.kob');
  return {outline:cs.outlineStyle+' '+cs.outlineColor, line:bf.content!=='none'&&bf.content!=='normal'&&parseFloat(bf.height)>0,
    lineUnderImg:(hr.left+parseFloat(bf.left||0)+1.5)>=ir.left&&(hr.left+parseFloat(bf.left||0)+1.5)<=ir.right,
    gap:Math.round(hr.top-ir.bottom), lineH:parseFloat(bf.height),
    stdVis:getComputedStyle(kb).visibility, stdImg:(kb.querySelector('img')||{}).src||'', roofImg:img.src,
    tateSame:tate.querySelector('.kob').classList.contains('same'),
    small:!!rf.querySelector('.nstd small, .rfspec small')&&/他の部位も同じ/.test(rf.textContent)};});
ok(/solid/.test(r.outline),T+'① 平場の行が枠で囲われている',r.outline);
ok(r.line&&r.lineUnderImg&&r.lineH>=r.gap,T+'① 新規防水の絵の真下から平場まで線がつながる','すき間'+r.gap+'px 線'+r.lineH+'px');
/* 新規防水の欄は高画質版（icons/kq/…）に差し替わるので、絵の「名前」で比べる */
const nm=u=>String(u||'').split('?')[0].split('/').pop().replace(/\.(png|webp|jpg)$/,'').replace(/^kou_/,'').replace(/_h\d+$/,'').replace(/_hq$/,'');
ok(r.stdVis==='visible'&&r.stdImg&&nm(r.stdImg)===nm(r.roofImg),T+'② 平場のボタン＝新規防水と同じ絵',nm(r.stdImg)+' / '+nm(r.roofImg));
ok(r.tateSame,T+'③ 立上り（別工法なし）は「同じ」表示');
ok(!r.small,T+'④ 小さい説明文字が無い');
const r2=await p.evaluate(()=>{const rf=document.querySelector('#f_kouji .rf'); const rk=rf.querySelector('.rfk').value;
  const other=[...rf.querySelector('.rfk').options].map(o=>o.value).find(v=>v&&v!==rk);
  const t=[...rf.querySelectorAll('.arr')].find(a=>a.dataset.k==='立上り'); t.dataset.ko=other; t.querySelector('input').dispatchEvent(new Event('input'));
  const k=t.querySelector('.kob'); return {set:k.classList.contains('set'), same:k.classList.contains('same'), other};});
ok(r2.set&&!r2.same,T+'③ 立上りに別の工法 → 「別」表示に変わる',r2.other);
await ctx.close();}
await b.close(); console.log(ng?('★NG '+ng+'件'):'すべて○');})();
