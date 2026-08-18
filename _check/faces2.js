/* ★2026-08-15 現場マップ側も同じ数字・同じ言い回しで出るか */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1600,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.route('**maps.googleapis.com**', r=>r.abort());
  await p.addInitScript(()=>{ localStorage.setItem('osamari_maps_key','dummy'); });
  await p.goto('http://localhost:8899/genba_map_v36.html'); await p.waitForTimeout(1800);
  const g=await p.evaluate(()=>{
    const s=SITES.find(x=>x.name.indexOf('三井アウトレット')>=0);
    const s2=SITES.find(x=>x.name.indexOf('太平医院')>=0);
    const rows=[...document.querySelectorAll('#panel .site')].map(d=>d.innerText.replace(/\s+/g,' ').trim());
    const hit=rows.find(t=>t.indexOf('三井アウトレット')>=0)||'';
    const plain=rows.find(t=>t.indexOf('太平医院')>=0)||'';
    return {loaded:!!window.nnFaceQtyText, q:nnQ(s), k:nnK(s), q2:nnQ(s2), k2:nnK(s2), hit, plain, rows:rows.length};
  });
  console.log(JSON.stringify(g,null,1));
  ok('共通データ（faces_sample.js）を読めている', g.loaded);
  ok('内訳のある現場は記録帳と同じ「3,100㎡＋180m（20面）」', g.q==='3,100㎡＋180m（20面）', g.q);
  ok('工法も「ほか4工法」でそろう', /ほか4工法/.test(g.k), g.k);
  ok('現場一覧の行にも出る', /20面/.test(g.hit), g.hit);
  ok('内訳の無い現場は今までどおり（333㎡）', g.q2==='333㎡' && g.k2.indexOf('ほか')<0, g.q2+' / '+g.k2);
  ok('内訳の無い現場の行も今までどおり', /333㎡/.test(g.plain), g.plain);
  ok('現場は100件のまま', g.rows===100, g.rows+'件');
  ok('JSエラーなし', errs.length===0, errs.join(' | '));
  console.log(R.join('\n'));
  await b.close();
})();
