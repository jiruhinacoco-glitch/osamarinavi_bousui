/* §1059 現場記録帳ダッシュボード：入金予定・歩掛実績・元請別受注の表がスマホモードで画面幅に収まるか（2026-11-07b）
   本人のスマホで3つとも表の右が切れていた（入金予定＝「開く ▶」の余白62px＋横並び固定／歩掛＝工法名の折り返し禁止／元請別＝8列826px）。
   ①スマホ縦（393・375）：3つの表の幅が置き場の幅に収まる（横に切れない）
   ②元請別：列は 元請/実績数/受注額(万円)/利益額(万円)/平均利益率/予実差/手戻り の7列。各行の元請名の下に比率バーがある。
     受注額は「検査側で別に足した値」を万円にしたものと一致（画面の集計関数は使わない）
   ③入金予定：カレンダーが表の下（上端が表の下端以上）
   ④PC（1400）：直す前のまま＝元請別は8列（比率バーの列あり）・金額は ¥…-
   使い方: node _check/tbl3phone.js [kirokucho_demo.html]   ※直す前の版（_before.html）を渡すと ①②③ が★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
async function open(b,vp,ph){
  const ctx=await b.newContext({...(ph?{viewport:vp,isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:vp}),serviceWorkers:'block'});
  await ctx.addInitScript(([ph,w,h])=>{ if(ph){ localStorage.setItem('nn_view_mode','mobile');
      try{Object.defineProperty(screen,'width',{get:()=>w});Object.defineProperty(screen,'height',{get:()=>h});}catch(e){} }
    sessionStorage.setItem('nn_vm_view','dash'); },[ph,vp.width,vp.height]);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(3000);
  const out={};
  for(const k of ['nyukin','bugakari','moto']){
    await p.evaluate(k=>document.querySelector('#dashboard .nn-dnav button[data-k="'+k+'"]').click(),k);
    await p.waitForFunction(k=>{const s=document.querySelector('#dashboard .nn-dsel');return s&&s.dataset.panelId===k&&s.querySelector('table');},k,{timeout:5000});
    out[k]=await p.evaluate(()=>{const sel=document.querySelector('#dashboard .nn-dsel');const tbl=sel.querySelector('table');
      const r=e=>{const q=e.getBoundingClientRect();return {l:q.left,t:q.top,r:q.right,b:q.bottom,w:q.width};};
      const rows=[...tbl.querySelectorAll('tr')].slice(1);
      const o={side:r(tbl.parentElement),tbl:r(tbl),cw:document.documentElement.clientWidth,th:[...tbl.querySelectorAll('tr:first-child th')].map(t=>t.textContent.replace(/[▲▼\s]/g,'')),
        barInName:rows.length&&rows.every(tr=>tr.cells[0].querySelector('.houbar')),
        first:rows[0]?[...rows[0].cells].map(c=>c.textContent.trim()):[]};
      const cal=sel.querySelector('.ncal'); if(cal)o.cal=r(cal);
      /* 元請別：検査側で独立に受注額を足す（画面の集計は呼ばない） */
      if(rows[0]&&typeof props!=='undefined'){const nm=rows[0].cells[0].querySelector('b')?.textContent.trim();
        o.want=props.filter(x=>['kan','kou','keiyaku'].includes(x.stRaw)&&(x.moto||'（元請未入力）')===nm).reduce((a,x)=>a+x.order,0);}
      return o;});
  }
  await ctx.close(); return {out,errs};
}
(async()=>{const b=await chromium.launch();
  for(const [nm,vp] of [['縦スマホ393',{width:393,height:852}],['細いスマホ375',{width:375,height:667}]]){
    const {out,errs}=await open(b,vp,true);
    for(const [k,lb] of [['nyukin','入金予定'],['bugakari','歩掛実績'],['moto','元請別受注']]){
      /* ★置き場（親の箱）は表といっしょに広がることがある（入金予定）ので、右端が画面の中にあることも見る */
      const m=out[k]; ok(nm+'：'+lb+'の表が置き場の幅に収まり右端が画面の中', m.tbl.w<=m.side.w+0.5 && m.tbl.r<=m.cw+0.5, Math.round(m.tbl.w)+'px / 置き場'+Math.round(m.side.w)+'px / 右端'+Math.round(m.tbl.r)+' 画面'+m.cw);
    }
    const mo=out.moto;
    ok(nm+'：元請別は7列（バー列なし・万円の見出し）', mo.th.join('|')==='元請|実績数|受注額(万円)|利益額(万円)|平均利益率|予実差|手戻り', mo.th.join('|'));
    ok(nm+'：元請別の各行の元請名の下に比率バー', !!mo.barInName);
    const got=parseFloat(String(mo.first[2]||'').replace(/[^0-9.]/g,''))||0;
    ok(nm+'：元請別1行目の受注額（万円）が検査側の集計と一致', mo.first.length>=3 && got===Math.round((mo.want||0)/10000), (mo.first[2]||'')+' / 検査側 '+Math.round((mo.want||0)/10000));
    const ny=out.nyukin; ok(nm+'：入金予定のカレンダーが表の下', !!ny.cal && ny.cal.t>=ny.tbl.b-1, ny.cal?JSON.stringify({calT:Math.round(ny.cal.t),tblB:Math.round(ny.tbl.b)}):'ncalなし');
    ok(nm+'：JSエラーなし', !errs.length, errs.join(' '));
  }
  const {out,errs}=await open(b,{width:1400,height:900},false);
  ok('PC1400：元請別は8列のまま（比率バーの列あり）', out.moto.th.length===8 && /比率|大きさ/.test(out.moto.th[1]), out.moto.th.join('|'));
  ok('PC1400：元請別の受注額は ¥…- のまま', /^¥[\d,]+-$/.test(out.moto.first[3]||''), out.moto.first[3]);
  ok('PC1400：元請名の下にバーは無い（横並びのまま）', !out.moto.barInName);
  ok('PC1400：JSエラーなし', !errs.length, errs.join(' '));
  await b.close(); R.forEach(x=>console.log(x)); const ng=R.filter(x=>x.startsWith('★NG')).length; console.log(ng?'★NG '+ng+'件':'全部○');})();
