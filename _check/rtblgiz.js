/* 3Dの「屋根の表」が、右上に浮いているもの（方角ガイド・操作パッド）に隠れていないか（2026-09-13m）
   使い方: node _check/rtblgiz.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [lbl,vp] of [['PC1440',{width:1440,height:900}],['PC1280',{width:1280,height:800}]]){
    const ctx=await b.newContext({viewport:vp});
    const p=await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,110)));
    await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
    await p.waitForSelector('.zmGoB[data-go="zu"]',{timeout:20000});
    await p.click('.zmGoB[data-go="zu"]');
    await p.waitForFunction(()=>typeof loadSample==='function');
    await p.evaluate(()=>loadSample());
    await p.evaluate(()=>setTab('d3'));
    /* 3Dが立ち上がって方角ガイドが出るまで「時間ではなく条件で」待つ */
    await p.waitForFunction(()=>{const g=document.getElementById('nnAxisGiz');
      return !!(g&&g.classList.contains('on')&&g.getBoundingClientRect().width>2);},{timeout:30000});
    await p.waitForTimeout(1000);   /* 置き直しの間隔（220ms）より長く */
    const r=await p.evaluate(()=>{
      const R=id=>{const e=document.getElementById(id);
        if(!e||getComputedStyle(e).display==='none')return null;
        const q=e.getBoundingClientRect(); return q.width>2?[q.left,q.top,q.right,q.bottom]:null;};
      const ov=(A,B)=>{ if(!A||!B)return 0;
        const x=Math.min(A[2],B[2])-Math.max(A[0],B[0]), y=Math.min(A[3],B[3])-Math.max(A[1],B[1]);
        return (x>0&&y>0)?Math.round(x*y):0; };
      const tbl=R('nnRoofTbl'), giz=R('nnAxisGiz'), pad=R('d3pad');
      return {tbl:tbl&&tbl.map(Math.round), giz:giz&&giz.map(Math.round), pad:pad&&pad.map(Math.round),
        ovGiz:ov(tbl,giz), ovPad:ov(tbl,pad),
        /* 表の幅が、逃がしたせいでつぶれていないか（読める広さが残っているか） */
        tblW: tbl? Math.round(tbl[2]-tbl[0]) : 0};
    });
    ok(!!r.tbl && !!r.giz, lbl+' 屋根の表と方角ガイドが両方出ている');
    ok(r.ovGiz===0, lbl+' 屋根の表が方角ガイドと重なっていない（重なり面積px²）', r.ovGiz);
    ok(r.ovPad===0, lbl+' 屋根の表が操作パッドと重なっていない（重なり面積px²）', r.ovPad);
    ok(r.tblW>=380, lbl+' 逃がしたあとも表の幅が残っている（380px以上）', r.tblW);
    ok(errs.length===0, lbl+' JSエラーなし', errs);
    await ctx.close();
  }
  await b.close();
  console.log(ng?('★NG 合計 '+ng):'○ 全項目OK');
  process.exit(0);
})();
