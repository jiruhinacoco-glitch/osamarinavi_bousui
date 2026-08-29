/* ★2026-08-30a 現場記録帳：4つの画面すべてに、タブの下の緑のラインがあるか
   ・現場一覧＝.toolbar の border-top（前からある）
   ・ダッシュボード／施工中物件（すべて）（自社のみ）＝#dashboard／#schedview の border-top（今回追加）
   あわせてタブの名前も見る（施工中物件（すべて）／（自社のみ））。
   使い方：node _check/topline.js       … いまのファイル
   　　　　node _check/topline.js <file>（例 _before.html）で変更前と比べられる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const file=process.argv[2]||'kirokucho_demo.html';
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1600,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+file,{waitUntil:'load'});
  await p.waitForTimeout(1500);
  const NG=[];
  const ok=(c,name,info)=>{ console.log((c?'○':'★NG')+' '+name+(info!==undefined?('　'+info):'')); if(!c)NG.push(name); };

  const tabs=await p.$$eval('#viewtabs button', bs=>bs.map(b=>b.textContent.trim()));
  ok(tabs[2]==='施工中物件（すべて）', 'タブ名：施工中物件（すべて）', tabs[2]);
  ok(tabs[3]==='施工中物件（自社のみ）', 'タブ名：施工中物件（自社のみ）', tabs[3]);

  /* 4つの画面それぞれで「タブのすぐ下に出ている中身の箱」の上の線を測る */
  const V=[['dash','ダッシュボード','#dashboard'],
           ['list','現場一覧','#toolbar'],
           ['zentai','施工中物件（すべて）','#schedview'],
           ['jisha','施工中物件（自社のみ）','#schedview']];
  for(const [v,label,sel] of V){
    await p.evaluate(x=>showView(x), v);
    /* ★登場演出（nnRise＝14px下からせり上がる）が終わるのを「時間」ではなく
       「条件」で待つ（§161の教訓）。終わる前に測ると、その分だけ離れて見える。 */
    await p.waitForFunction(s=>{ const el=document.querySelector(s);
      if(!el) return false; const t=getComputedStyle(el).transform;
      return t==='none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(t); }, sel, {timeout:8000}).catch(()=>{});
    await p.waitForTimeout(200);
    const r=await p.evaluate(sel=>{
      const el=document.querySelector(sel); if(!el) return null;
      const cs=getComputedStyle(el);
      const tb=document.getElementById('viewtabs').getBoundingClientRect();
      const er=el.getBoundingClientRect();
      return {w:parseFloat(cs.borderTopWidth), c:cs.borderTopColor,
              vis:cs.display!=='none', gap:+(er.top-tb.bottom).toFixed(1),
              full:+(er.width-document.documentElement.clientWidth).toFixed(1)};
    }, sel);
    ok(r&&r.vis&&r.w>=2, label+'：線が2px以上ある', r?(r.w+'px '+r.c):'要素なし');
    ok(r&&r.gap<1.5, label+'：タブのすぐ下に出ている', r?(r.gap+'px'):'-');
  }
  ok(errs.length===0,'JSエラーなし', errs.join('|')||'');
  console.log('===', file, ' ★NG', NG.length, NG.join(' / '));
  await b.close();
})();
