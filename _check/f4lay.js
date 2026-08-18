const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const run=async(b,W,H,name)=>{
  const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1400);
  /* 3D */
  await p.evaluate(()=>{ loadSample(); setTab('d3'); });
  await p.waitForTimeout(1200);
  const d=await p.evaluate(()=>{
    const pad=document.getElementById('d3pad');
    const tab=document.getElementById('navShowTab');
    if(tab)tab.style.display='block';           /* ▲（ナビが隠れているとき）を出して測る */
    const pr=pad.getBoundingClientRect(), tr=tab?tab.getBoundingClientRect():null;
    const bs=[...pad.querySelectorAll('button')].map(x=>{const r=x.getBoundingClientRect();return {t:+r.top.toFixed(1),b:+r.bottom.toFixed(1),l:+r.left.toFixed(1),r:+r.right.toFixed(1)};});
    const hit=tr?bs.filter(x=>!(x.b<=tr.top||x.t>=tr.bottom||x.r<=tr.left||x.l>=tr.right)).length:0;
    const outBottom=bs.filter(x=>x.b>innerHeight+0.5).length;
    return {n:bs.length, padTop:+pr.top.toFixed(1), padBottom:+pr.bottom.toFixed(1),
            tab:tr?{t:+tr.top.toFixed(1),b:+tr.bottom.toFixed(1),l:+tr.left.toFixed(1)}:null,
            hit, outBottom, cols:new Set(bs.map(x=>x.l)).size, vh:innerHeight};
  });
  console.log(name,'3D:',JSON.stringify(d));
  ok(name+'：3Dのボタンが▲と重ならない', d.hit===0, 'かぶり'+d.hit+'個');
  ok(name+'：3Dのボタンが画面外に出ない', d.outBottom===0, '外'+d.outBottom+'個');
  /* 割付タブのツールバー幅 */
  await p.evaluate(()=>setTab('wf')); await p.waitForTimeout(700);
  const t=await p.evaluate(()=>{
    const tb=document.getElementById('toolbar');
    const vis=[...tb.children].filter(x=>getComputedStyle(x).display!=='none');
    const rs=vis.map(x=>x.getBoundingClientRect());
    return {n:vis.length, right:+Math.max(...rs.map(r=>r.right)).toFixed(1),
            rows:new Set(rs.map(r=>Math.round((r.top+r.bottom)/2/8))).size, w:innerWidth,
            names:vis.map(x=>(x.textContent||x.id).trim().slice(0,8))};
  });
  console.log(name,'割付ツールバー:',JSON.stringify(t));
  ok(name+'：割付のツールバーが1段', t.rows===1, t.rows+'段');
  ok(name+'：割付のツールバーがはみ出さない', t.right<=t.w+1, '右端'+t.right+' ＜ 幅'+t.w);
  const m=await p.evaluate(()=>{
    const e=document.getElementById('tl_wfdim');
    if(!e) return {ある:false};
    const menu=document.getElementById('tbMenu');
    return {ある:true, 道具の中:!!(menu&&menu.contains(e)),
            見える:getComputedStyle(e).display!=='none', 文字:e.textContent.trim()};
  });
  console.log(name,'寸法ボタン:',JSON.stringify(m));
  ok(name+'：📏寸法ボタンが割付タブで使える', m.ある&&m.見える, JSON.stringify(m));
  await p.evaluate(()=>setTab('zu')); await p.waitForTimeout(400);
  const m2=await p.evaluate(()=>getComputedStyle(document.getElementById('tl_wfdim')).display);
  ok(name+'：図面タブでは出さない', m2==='none', m2);
  ok(name+'：JSエラーなし', errs.length===0, errs[0]||'');
  await p.screenshot({path:__dirname+'/f4_'+name+'.png'});
  await p.close();
};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  await run(b,393,852,'たて');
  await run(b,852,393,'よこ');
  console.log(R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'★ NG あり':'すべて○');
  await b.close();
})();
