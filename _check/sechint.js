/* 断面図タブ：平面図の案内ふきだしを出さない＋層構成の一覧が読める＋帯の見出しが「断面図モード」（2026-09-13m）
   使い方: node _check/sechint.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '+
         '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [lbl,vp,mob] of [['PC',{width:1440,height:900},0],['スマホ',{width:393,height:852},1]]){
    const ctx=await b.newContext({viewport:vp,isMobile:!!mob,hasTouch:!!mob,userAgent:mob?UA:undefined});
    const p=await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,110)));
    await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
    await p.waitForSelector('.zmGoB[data-go="zu"]',{timeout:20000});
    await p.click('.zmGoB[data-go="zu"]');            /* 平面図で始める */
    await p.waitForFunction(()=>typeof loadSample==='function'&&typeof setTab==='function');
    await p.evaluate(()=>loadSample());
    await p.evaluate(()=>setTab('sec'));
    await p.waitForTimeout(1200);
    const r=await p.evaluate(()=>{
      const h=document.getElementById('hint');
      const hs=h?getComputedStyle(h):null;
      const shown=!!(h&&h.offsetParent&&hs.display!=='none'&&hs.visibility!=='hidden');
      const hr=shown?h.getBoundingClientRect():null;
      /* 層構成の一覧は断面図のキャンバスに直接描いてある（左下）。
         「その文字の場所を指でつついたら、何に当たるか」で覆われていないかを見る
         （キャンバス自身に当たれば覆われていない）。 */
      const sc=document.querySelector('#secwrap canvas')||document.querySelectorAll('canvas')[0];
      let covered=0, layers=0, who=[];
      if(sc){
        const q=sc.getBoundingClientRect();
        /* 層構成は左下から上へ数行ぶん。左端から 120px・下から 16〜104px を見る */
        for(let dy=16; dy<=104; dy+=22){
          const x=q.left+40, y=q.bottom-dy;
          if(y<q.top+10) continue;
          layers++;
          const e=document.elementFromPoint(x,y);
          /* #secNote（「立上り300mm／天端250mm…」）は断面図そのものの説明で、
             層構成の一覧の**下**に置く決まりなので覆いとは数えない。 */
          if(e && e!==sc && !sc.contains(e) && e.id!=='secNote' && !(e.closest&&e.closest('#secNote'))){
            covered++;
            who.push((e.id||'.'+String(e.className).split(' ')[0])+'@'+Math.round(y)); }
        }
      }
      const md=document.getElementById('hdMode');
      return {hintShown:shown, layers, covered, who:who.slice(0,4),
        hintText:(h?(h.textContent||'').trim().slice(0,14):''),
        mode:md?(md.textContent||'').trim():null, tab};
    });
    ok(r.tab==='sec', lbl+' 断面図タブになっている', r.tab);
    ok(!r.hintShown, lbl+' 断面図では平面図の案内ふきだしを出さない', r.hintText);
    ok(r.layers>0 && r.covered===0, lbl+' 断面図の左下（層構成の一覧）が何にも覆われていない', {見た点:r.layers,覆われた:r.covered,何:r.who});
    ok(/断面図/.test(r.mode||''), lbl+' 帯の見出しが「断面図」になっている', r.mode);
    /* 平面図へ戻したら案内ふきだしは戻る（消しっぱなしにしない） */
    await p.evaluate(()=>setTab('zu')); await p.waitForTimeout(700);
    const z=await p.evaluate(()=>{const h=document.getElementById('hint');
      const md=document.getElementById('hdMode');
      return {shown:!!(h&&h.offsetParent&&getComputedStyle(h).display!=='none'),
              mode:md?(md.textContent||'').trim():null};});
    ok(z.shown, lbl+' 平面図に戻すと案内ふきだしが戻る');
    ok(/平面図/.test(z.mode||''), lbl+' 平面図に戻すと見出しも「平面図」に戻る', z.mode);
    ok(errs.length===0, lbl+' JSエラーなし', errs);
    await ctx.close();
  }
  await b.close();
  console.log(ng?('★NG 合計 '+ng):'○ 全項目OK');
  process.exit(0);
})();
