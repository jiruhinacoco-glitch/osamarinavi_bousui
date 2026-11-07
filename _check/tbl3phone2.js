/* §1060 現場記録帳ダッシュボード：要対応・施工中の現場・工法別受注がスマホモードで画面幅に収まるか（2026-11-07c）
   本人のスマホで3つとも表の右が切れていた（要対応873px／施工中927px／工法別774px。画面は365px）。
   ①スマホ縦（393・375）：3つの表の幅が置き場の幅に収まり、右端が画面の中
   ②工法別：列は 工法/面積/受注額(万円)/利益額(万円)/平均利益率/実績数 の6列。各行の工法名の下に絵と比率バー。
     受注額は「検査側で別に足した値」を万円にしたものと一致（画面の集計関数は使わない）
   ③要対応・施工中：1行がカード（tr が grid）。施工中は各欄に小さな見出し（数量・メーカー…）が付き、請負額は「◯万」
   ④PC（1400）：直す前のまま＝工法別は8列（絵・バーの列あり）・金額は ¥…-／要対応・施工中は普通の表の行
   使い方: node _check/tbl3phone2.js [kirokucho_demo.html]   ※直す前の版（_before.html）を渡すと ①②③ が★NG */
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
  for(const k of ['taio','sekou','hou']){
    await p.evaluate(k=>document.querySelector('#dashboard .nn-dnav button[data-k="'+k+'"]').click(),k);
    await p.waitForFunction(k=>{const s=document.querySelector('#dashboard .nn-dsel');return s&&s.dataset.panelId===k&&s.querySelector('table');},k,{timeout:5000});
    out[k]=await p.evaluate(()=>{const sel=document.querySelector('#dashboard .nn-dsel');const tbl=sel.querySelector('table');
      const r=e=>{const q=e.getBoundingClientRect();return {l:q.left,t:q.top,r:q.right,b:q.bottom,w:q.width};};
      const rows=[...tbl.querySelectorAll('tr')].filter(tr=>tr.querySelector('td'));
      const o={cw:document.documentElement.clientWidth,side:r(tbl.parentElement),tbl:r(tbl),
        th:[...tbl.querySelectorAll('tr th')].map(t=>t.textContent.replace(/[▲▼\s]/g,'')),
        rowDisp:rows[0]?getComputedStyle(rows[0]).display:'',
        barInName:rows.length&&rows.every(tr=>tr.cells[0].querySelector('.houbar')),
        imgInName:rows.length&&rows.every(tr=>tr.cells[0].querySelector('img')),
        first:rows[0]?[...rows[0].cells].map(c=>c.textContent.trim()):[],
        labels:rows[0]?[...rows[0].cells].map(c=>getComputedStyle(c,'::before').content.replace(/"/g,'')).filter(x=>x&&x!=='none'):[]};
      if(rows[0]&&typeof props!=='undefined'&&typeof houLabel!=='undefined'){const nm=rows[0].cells[0].querySelector('b')?.textContent.trim()||rows[0].cells[1]?.textContent.trim();
        o.want=props.filter(x=>['kan','kou','keiyaku'].includes(x.stRaw)&&houLabel(x.kouhouKind||x.kind||'')===nm).reduce((a,x)=>a+x.order,0);}
      return o;});
  }
  await ctx.close(); return {out,errs};
}
(async()=>{const b=await chromium.launch();
  for(const [nm,vp] of [['縦スマホ393',{width:393,height:852}],['細いスマホ375',{width:375,height:667}]]){
    const {out,errs}=await open(b,vp,true);
    for(const [k,lb] of [['taio','要対応'],['sekou','施工中の現場'],['hou','工法別受注']]){
      const m=out[k]; ok(nm+'：'+lb+'の表が置き場の幅に収まり右端が画面の中', m.tbl.w<=m.side.w+0.5 && m.tbl.r<=m.cw+0.5, Math.round(m.tbl.w)+'px / 置き場'+Math.round(m.side.w)+'px / 右端'+Math.round(m.tbl.r)+' 画面'+m.cw);
    }
    const h=out.hou;
    ok(nm+'：工法別は6列（絵・バー列なし・万円の見出し）', h.th.join('|')==='工法|面積|受注額(万円)|利益額(万円)|平均利益率|実績数', h.th.join('|'));
    ok(nm+'：工法別の各行の工法名の下に絵と比率バー', !!h.barInName && !!h.imgInName);
    ok(nm+'：要対応の1行がカード（grid）', out.taio.rowDisp==='grid', out.taio.rowDisp);
    ok(nm+'：施工中の1行がカード（grid）・各欄に小見出し・請負額は万', out.sekou.rowDisp==='grid' && out.sekou.labels.includes('数量') && out.sekou.labels.includes('請負額') && /万$/.test(out.sekou.first[8]||''), out.sekou.rowDisp+' '+out.sekou.labels.join(',')+' '+(out.sekou.first[8]||''));
    ok(nm+'：JSエラーなし', !errs.length, errs.join(' '));
  }
  /* ★§1061 本人の実データ＝1件に仕様が4〜5個。札が横幅を全部取って物件名が縦1文字に潰れた。既存2件の仕様を5個に差し替えて再現 */
  { const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
    await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','dash');});
    const p=await ctx.newPage(); await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(3000);
    await p.evaluate(()=>{const orig=window.nnKoList; window.nnKoList=function(q){ if(/東京流通センター|三井アウトレット/.test(q.name||'')) return [{ko:'塩ビ',sp:'S-M1',mk:'ヤマデ'},{ko:'ウレタン',sp:'X-2H',mk:'ダイフ'},{ko:'ウレタン',sp:'X-1',mk:'田島'},{ko:'改質',sp:'AS-J1',mk:'田島'},{ko:'シーリング',sp:'シーリング（部分）',mk:''}]; return orig(q); }; renderDash(); });
    await p.waitForFunction(()=>!!document.querySelector('#dashboard .nn-dnav button[data-k="sekou"]'),null,{timeout:5000}); await p.waitForTimeout(300);
    await p.evaluate(()=>document.querySelector('#dashboard .nn-dnav button[data-k="sekou"]').click());
    await p.waitForFunction(()=>{const s=document.querySelector('#dashboard .nn-dsel');return s&&s.dataset.panelId==='sekou'&&s.querySelector('table');},null,{timeout:5000});
    const m=await p.evaluate(()=>{const sel=document.querySelector('#dashboard .nn-dsel'); const tr=[...sel.querySelectorAll('tr.click')].find(t=>t.textContent.includes('東京流通センター')); if(!tr) return null;
      const r=e=>e.getBoundingClientRect(); const c=cls=>tr.querySelector('.'+cls)||tr.cells[{'skc-bukken':0,'skc-spec':3,'skc-order':8}[cls]]; const o=c('skc-order'), nm=c('skc-bukken'), sp=c('skc-spec');
      return {nameW:Math.round(r(nm).width), badges:sp.querySelectorAll('.badge').length, specBelowName:r(sp).top>=r(nm).bottom-1, orderClip:o.scrollWidth>o.clientWidth+1, rowH:Math.round(r(tr).height), tblW:Math.round(r(sel.querySelector('table')).width)};});
    ok('仕様5個の物件：物件名が200px以上の幅（縦1文字に潰れない）', !!m && m.badges===5 && m.nameW>=200, m?JSON.stringify(m):'行なし');
    ok('仕様5個の物件：札は物件名の下・請負額が切れない・1行の高さ260px以下', !!m && m.specBelowName && !m.orderClip && m.rowH<=260 && m.tblW<=366, m?JSON.stringify(m):'行なし');
    await ctx.close(); }
  const {out,errs}=await open(b,{width:1400,height:900},false);
  ok('PC1400：工法別は8列のまま（絵・バーの列あり）', out.hou.th.length===8 && /比率|大きさ/.test(out.hou.th[2]), out.hou.th.join('|'));
  ok('PC1400：工法別の受注額は ¥…- のまま', /^¥[\d,]+-$/.test(out.hou.first[4]||''), out.hou.first[4]);
  ok('PC1400：要対応・施工中は普通の表の行（table-row）', out.taio.rowDisp==='table-row' && out.sekou.rowDisp==='table-row', out.taio.rowDisp+'/'+out.sekou.rowDisp);
  ok('PC1400：施工中の請負額は ¥…- のまま・小見出しなし', /^¥[\d,]+-$/.test(out.sekou.first[8]||'') && out.sekou.labels.length===0, (out.sekou.first[8]||'')+' '+out.sekou.labels.join(','));
  ok('PC1400：JSエラーなし', !errs.length, errs.join(' '));
  await b.close(); R.forEach(x=>console.log(x)); const ng=R.filter(x=>x.startsWith('★NG')).length; console.log(ng?'★NG '+ng+'件':'全部○');})();
