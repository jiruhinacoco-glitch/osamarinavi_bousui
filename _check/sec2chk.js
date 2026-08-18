const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({viewport:{width:1280,height:820}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200);
  const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex?'  '+ex:''));
  await p.evaluate(()=>{ const b=document.getElementById('tl_sample'); if(b)b.click();   /* ★2026-08-16a ボタン名が「サンプル」に */ });
  await p.waitForTimeout(700);
  await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(700);
  const st = await p.evaluate(()=>{
    const c=document.getElementById('secCv');
    const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let ink=0; for(let i=0;i<d.length;i+=4){ if(!(d[i]>245&&d[i+1]>245&&d[i+2]>240))ink++; }
    return { ink, note:document.getElementById('secNote').textContent,
             polys:document.getElementById('sec_poly').options.length,
             edges:document.getElementById('sec_edge').options.length,
             pdf:!!document.getElementById('sec_pdf') };
  });
  ok('詳細図が描かれている', st.ink>20000, '描画画素 '+st.ink);
  ok('部位を選べる', st.polys===3, st.polys+'件');
  ok('辺を選べる（代表＋各辺）', st.edges>=5, st.edges+'件');
  ok('PDFボタンがある', st.pdf);
  ok('立上り・天端の案内', /立上り \d+mm ／ 天端/.test(st.note), st.note.slice(0,40));
  await p.screenshot({path:'sec2_light.png'});
  // 辺を選ぶと寸法が変わる
  await p.evaluate(()=>{ const se=document.getElementById('sec_edge'); se.value='0'; se.dispatchEvent(new Event('change')); });
  await p.waitForTimeout(400);
  const n2 = await p.evaluate(()=>document.getElementById('secNote').textContent);
  ok('辺を選ぶと切り替わる', n2.includes('辺1'), n2.slice(0,44));
  // 図面タブに赤い切断線が残っていないこと
  await p.evaluate(()=>setTab('zu')); await p.waitForTimeout(500);
  const red = await p.evaluate(()=>{
    const c=document.getElementById('cv'),x=c.getContext('2d');
    const d=x.getImageData(0,0,c.width,c.height).data; let r=0;
    for(let i=0;i<d.length;i+=4){ if(d[i]>150&&d[i+1]<90&&d[i+2]<80)r++; }
    return r;
  });
  ok('図面タブの切断線は消えた', red<200, '赤い画素 '+red);
  // 夜モード
  await p.evaluate(()=>{ setTab('sec'); nnSetTheme('dark'); nnSecDraw(); }); await p.waitForTimeout(500);
  const dk = await p.evaluate(()=>{
    const c=document.getElementById('secCv');
    const d=c.getContext('2d').getImageData(0,0,c.width,300).data; let dark=0,tot=0;
    for(let i=0;i<d.length;i+=4){tot++; if(d[i]<80&&d[i+1]<80&&d[i+2]<90)dark++;}
    return dark/tot;
  });
  ok('夜モードでも描ける', dk>0.6, '暗い画素 '+Math.round(dk*100)+'%');
  await p.screenshot({path:'sec2_dark.png'});
  await p.evaluate(()=>nnSetTheme('light'));
  console.log(R.join('\n'));
  console.log(errs.length?'JSエラー:\n'+errs.join('\n'):'JSエラーなし');
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
