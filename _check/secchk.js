const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({viewport:{width:1280,height:820}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200);
  const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex?'  '+ex:''));
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('サンプル形状')); if(b)b.click(); });
  await p.waitForTimeout(700);
  ok('タブ「③ 断面」がある', await p.evaluate(()=>!!document.getElementById('ht_sec')));
  // 図面タブに切断線が出る
  const line = await p.evaluate(()=>{
    const c=document.getElementById('cv'),x=c.getContext('2d');
    const d=x.getImageData(0,0,c.width,c.height).data; let red=0;
    for(let i=0;i<d.length;i+=4){ if(d[i]>150&&d[i+1]<90&&d[i+2]<80)red++; }
    return red;
  });
  ok('図面に赤い切断線が出る', line>200, '赤い画素 '+line);
  // 断面タブへ
  await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(700);
  const st = await p.evaluate(()=>{
    const w=document.getElementById('secwrap');
    const c=document.getElementById('secCv');
    const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let ink=0; for(let i=0;i<d.length;i+=4){ if(!(d[i]>245&&d[i+1]>245&&d[i+2]>240))ink++; }
    return { on:w.classList.contains('on'), note:document.getElementById('secNote').textContent,
             ink, cut:(window.nnSecCut()||{segs:[]}).segs.length,
             toolbarHidden:getComputedStyle(document.getElementById('toolbar')).display==='none' };
  });
  ok('断面タブに切り替わる', st.on && st.toolbarHidden);
  ok('断面が描かれている', st.ink>4000, '描画画素 '+st.ink);
  ok('切断区間が求まる', st.cut>=1, st.cut+'区間');
  ok('見出しにA-A\'', st.note.includes("A-A'"), st.note.slice(0,30));
  await p.screenshot({path:'sec_h.png'});
  // 縦に切る
  await p.click('#sec_v'); await p.waitForTimeout(500);
  const v = await p.evaluate(()=>({note:document.getElementById('secNote').textContent, cut:(window.nnSecCut()||{segs:[]}).segs.length}));
  ok('縦に切れる（B-B\'）', v.note.includes("B-B'") && v.cut>=1, v.cut+'区間');
  // 位置スライダー
  await p.evaluate(()=>{ const r=document.getElementById('sec_pos'); r.value=25; r.dispatchEvent(new Event('input')); });
  await p.waitForTimeout(400);
  ok('位置を変えられる', await p.evaluate(()=>Math.round(state.sec.pos*100)===25), await p.evaluate(()=>document.getElementById('sec_posv').textContent));
  // 夜モードでも描ける
  await p.evaluate(()=>{ nnSetTheme('dark'); nnSecDraw(); }); await p.waitForTimeout(400);
  const dk = await p.evaluate(()=>{
    const c=document.getElementById('secCv');
    const d=c.getContext('2d').getImageData(0,0,c.width,300).data; let dark=0,tot=0;
    for(let i=0;i<d.length;i+=4){tot++; if(d[i]<80&&d[i+1]<80&&d[i+2]<90)dark++;}
    return dark/tot;
  });
  ok('夜モードでも断面が描ける', dk>0.7, '暗い画素 '+Math.round(dk*100)+'%');
  await p.screenshot({path:'sec_dark.png'});
  await p.evaluate(()=>nnSetTheme('light'));
  // 3Dタブが④になっても動く
  await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(500);
  ok('3Dタブに移れる', await p.evaluate(()=>document.getElementById('ht_d3').classList.contains('on')));
  await p.evaluate(()=>setTab('zu')); await p.waitForTimeout(400);
  ok('図面に戻れる', await p.evaluate(()=>document.getElementById('ht_zu').classList.contains('on') && !document.getElementById('secwrap').classList.contains('on')));
  console.log(R.join('\n'));
  console.log(errs.length?'JSエラー:\n'+errs.join('\n'):'JSエラーなし');
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
