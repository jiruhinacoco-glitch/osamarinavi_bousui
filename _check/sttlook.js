/* §1065 現場記録帳ダッシュボード「ステータス分布」：データバー・タグの光沢・円グラフの作り（2026-11-07h）
   ①データバー：件数・見積金額・受注金額・利益額のマス（td.dbar）に、検査側で別に計算した割合（全物件に対する％）と同じ長さ（--p）が付く。全物件の行は100%。
     しま模様の行でも背景画像がバー（linear-gradient 2層）になっている
   ②タグ：ステータスの札が一覧と同じ光沢（地が linear-gradient・角3px・下に1pxの影）
   ③円グラフ：扇の数だけ linearGradient があり、扇の fill が url(#…)。下に厚み（translate(0,3) の同じ形）がある。中央に円盤
   PC1400・スマホ393 の両方。使い方: node _check/sttlook.js [kirokucho_demo.html]   ※直す前の版は ①②③ が★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
async function run(b,ph){
  const ctx=await b.newContext({...(ph?{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1400,height:900}}),serviceWorkers:'block'});
  await ctx.addInitScript(ph=>{ if(ph)localStorage.setItem('nn_view_mode','mobile'); sessionStorage.setItem('nn_vm_view','dash'); },ph);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(3000);
  await p.evaluate(()=>document.querySelector('#dashboard .nn-dnav button[data-k="stt"]').click());
  await p.waitForFunction(()=>{const s=document.querySelector('#dashboard .nn-dsel');return s&&s.dataset.panelId==='stt'&&s.querySelector('svg');},null,{timeout:5000});
  const m=await p.evaluate(()=>{const sel=document.querySelector('#dashboard .nn-dsel'); const tbl=sel.querySelector('table.st-tbl');
    const rows=[...tbl.querySelectorAll('tr')].slice(1); const last=rows[rows.length-1];
    /* 検査側で独立に集計（画面の集計は呼ばない） */
    const by={}; props.forEach(x=>{const o=(by[x.status]=by[x.status]||{n:0,amt:0}); o.n++; o.amt+=x.order;});
    const total=props.length, totAmt=props.reduce((a,x)=>a+x.order,0);
    const bad=[];
    rows.slice(0,-1).forEach(tr=>{const st=tr.querySelector('.sttag')?.textContent.trim(); const w=by[st]; if(!w){bad.push(st+':データなし');return;}
      const tdN=tr.cells[1], tdM=tr.cells[2];
      const pN=parseFloat(tdN.style.getPropertyValue('--p'))||0, pM=parseFloat(tdM.style.getPropertyValue('--p'))||0;
      if(!tdN.classList.contains('dbar')) bad.push(st+':件数にdbarなし');
      if(Math.abs(pN-w.n/total*100)>0.15) bad.push(st+' 件数 '+pN+'≠'+(w.n/total*100).toFixed(1));
      if(w.amt&&Math.abs(pM-w.amt/totAmt*100)>0.15) bad.push(st+' 見積 '+pM+'≠'+(w.amt/totAmt*100).toFixed(1));
      const bi=getComputedStyle(tdN).backgroundImage; if(!/linear-gradient[\s\S]*linear-gradient/.test(bi)) bad.push(st+':バーの背景なし');
    });
    const lastP=[1,2,3,4].map(i=>last.cells[i]&&last.cells[i].style.getPropertyValue('--p')).join(',');
    const tag=tbl.querySelector('.sttag'); const tc=getComputedStyle(tag);
    const svg=sel.querySelector('svg'); const segs=[...svg.querySelectorAll('.stseg')];
    return {bad,lastP,tag:{bgi:tc.backgroundImage.slice(0,40),radius:tc.borderRadius,shadow:tc.boxShadow},
      pie:{segs:segs.length,grads:svg.querySelectorAll('linearGradient').length,urlFill:segs.filter(e=>/url\(/.test(e.getAttribute('fill')||e.getAttribute('stroke')||'')).length,shadow:svg.querySelectorAll('[transform="translate(0,3)"]').length,center:!!svg.querySelector('circle[fill="#fffdf5"]')}};});
  const nm=ph?'スマホ393':'PC1400';
  ok(nm+'：データバーの長さが検査側の割合と一致（件数・見積金額）・しま模様の行でもバーあり', !m.bad.length, m.bad.join(' / '));
  ok(nm+'：全物件の行のバーは100%', m.lastP==='100%,100%,100%,100%', m.lastP);
  ok(nm+'：ステータスの札が一覧と同じ光沢（グラデーション地・角3px・下に影）', /linear-gradient/.test(m.tag.bgi)&&m.tag.radius==='3px'&&/0px 1px 0px/.test(m.tag.shadow), JSON.stringify(m.tag));
  ok(nm+'：円グラフは扇ごとのグラデーション・下に厚み・中央の円盤', m.pie.segs>0&&m.pie.grads===m.pie.segs&&m.pie.urlFill===m.pie.segs&&m.pie.shadow===m.pie.segs&&m.pie.center, JSON.stringify(m.pie));
  ok(nm+'：JSエラーなし', !errs.length, errs.join(' '));
  await ctx.close();
}
(async()=>{const b=await chromium.launch(); await run(b,false); await run(b,true); await b.close();
  R.forEach(x=>console.log(x)); const ng=R.filter(x=>x.startsWith('★NG')).length; console.log(ng?'★NG '+ng+'件':'全部○');})();
