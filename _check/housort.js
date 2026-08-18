const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1500,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2200);

  const info=async()=>p.evaluate(()=>{
    const t=document.querySelector('.hou-tbl'); if(!t)return null;
    const hs=[...t.querySelectorAll('th')].map(x=>({txt:x.innerText.replace(/\s+/g,' ').trim(), on:x.classList.contains('hsorted')}));
    const rows=[...t.querySelectorAll('tr')].slice(1).map(tr=>{
      const td=[...tr.querySelectorAll('td')];
      const bar=tr.querySelector('.houbar i');
      return {name:(td[1]||td[0]).innerText.trim(),
              w:bar?bar.style.width:'',
              pct:(tr.querySelector('.houbar b')||{}).textContent||'',
              onCells:td.filter(x=>x.classList.contains('hsorted')).length};
    });
    const band=document.querySelector('.housort');
    return {hs, rows, band:band?band.innerText.replace(/\s+/g,' ').trim():null};
  });

  let d=await info();
  console.log('--- 既定 ---'); console.log(JSON.stringify(d.band)); console.log(JSON.stringify(d.rows));
  ok('帯が出ている', !!d.band && /並び順/.test(d.band), d.band);
  ok('既定は「バーの比率＝受注額」', /受注額/.test(d.band), d.band);
  ok('既定は並び替え中の列なし', d.hs.every(h=>!h.on));

  /* 面積で並べ替える */
  await p.evaluate(()=>dashSortSet('hou','area')); await p.waitForTimeout(900);
  d=await info();
  console.log('--- 面積 ---'); console.log(JSON.stringify(d.band)); console.log(JSON.stringify(d.rows));
  ok('帯が「面積 の大きい順」になる', /面積 の大きい順/.test(d.band), d.band);
  ok('帯の「バーの比率」が面積になる', /バーの比率 面積/.test(d.band), d.band);
  ok('面積の列見出しが黄色（hsorted）', d.hs.some(h=>h.on && /面積/.test(h.txt)), JSON.stringify(d.hs.map(h=>h.txt+(h.on?'★':''))));
  ok('面積の列の中身にも目印が付く', d.rows.every(r=>r.onCells===1), JSON.stringify(d.rows.map(r=>r.onCells)));
  ok('比率の列見出しに「面積」が出る', d.hs.some(h=>/比率 面積/.test(h.txt)), JSON.stringify(d.hs.map(h=>h.txt)));
  /* 面積の比率の合計が約100% */
  const sum=d.rows.reduce((a,r)=>a+parseFloat(r.pct),0);
  ok('面積の比率の合計が約100%', Math.abs(sum-100)<0.5, sum.toFixed(1)+'%');
  /* 1位のバーが100% */
  ok('1位のバーが100%幅', parseFloat(d.rows[0].w)===100, d.rows[0].w);

  /* 実績数 */
  await p.evaluate(()=>dashSortSet('hou','n')); await p.waitForTimeout(900);
  d=await info();
  console.log('--- 実績数 ---'); console.log(JSON.stringify(d.band)); console.log(JSON.stringify(d.rows));
  const sum2=d.rows.reduce((a,r)=>a+parseFloat(r.pct),0);
  ok('実績数を選ぶと実績数の比率になる', /バーの比率 実績数/.test(d.band) && Math.abs(sum2-100)<0.5, d.band+' 合計'+sum2.toFixed(1)+'%');

  /* 平均利益率＝比率ではなく大きさ */
  await p.evaluate(()=>dashSortSet('hou','rate')); await p.waitForTimeout(900);
  d=await info();
  console.log('--- 平均利益率 ---'); console.log(JSON.stringify(d.band));
  ok('平均利益率は「大きさ」と出る', /バーの大きさ 平均利益率/.test(d.band), d.band);
  ok('平均利益率の値がそのまま出る', Math.abs(parseFloat(d.rows[0].pct)-18.4)<0.2, d.rows[0].pct);

  /* 戻す */
  await p.evaluate(()=>houSortReset()); await p.waitForTimeout(900);
  d=await info();
  ok('「並びを戻す」で既定に戻る', /受注額/.test(d.band) && d.hs.every(h=>!h.on), d.band);

  ok('JSエラーなし', errs.length===0, errs[0]||'');
  console.log(R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'★ NG あり':'すべて○');
  await b.close();
})();
