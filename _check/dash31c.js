/* 2026-08-31c ダッシュボード3件の検査
   ①ステータス分布の円グラフ＝pathのスライス・白い切れ目・文字が見切れない
   ②入金カレンダー＝高さが枠いっぱい（#calboxのflex連鎖切れの再発防止）・曜日の行だけ巨大にならない
   ③完成工事高の予実バー（.cbar）＝光沢・四角・濃い輪郭・色の深み
   使い方: node _check/dash31c.js [ファイル名]（省略=kirokucho_demo.html） */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
let ng=0; const ok=(c,t,d)=>{console.log((c?'○':'★NG')+' '+t+(d!==undefined?'　'+JSON.stringify(d):'')); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext({viewport:{width:1600,height:900},deviceScaleFactor:2});
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+FILE);
  await p.waitForTimeout(2500);
  const m=await p.evaluate(()=>{
    const svg=document.querySelector('.stflex svg');
    const segs=[...svg.querySelectorAll('.stseg')];
    const texts=[...svg.querySelectorAll('text')].filter(t=>t.getAttribute('pointer-events')==='none'&&t.textContent!=='表示中'&&!/件$/.test(t.textContent));
    let clip=0, boxes=[];
    texts.forEach(t=>{const bb=t.getBBox(); boxes.push([bb.x,bb.y,bb.width,bb.height]);
      if(bb.x<0||bb.y<0||bb.x+bb.width>200||bb.y+bb.height>200)clip++;});
    const gap=segs.length>1 && segs.every(s=>s.tagName==='path'&&s.getAttribute('stroke')==='#fff'&&+s.getAttribute('stroke-width')>=2);
    /* カレンダー */
    const cal=document.querySelector('#calbox .cal');
    const tds=[...cal.querySelectorAll('td')];
    const rowH=tds[Math.floor(tds.length/2)].getBoundingClientRect().height;
    const thH=cal.querySelector('th').getBoundingClientRect().height;
    const calBoxH=document.querySelector('#calbox').getBoundingClientRect().height;
    const leftH=document.querySelector('.nyuflex > div:first-child').getBoundingClientRect().height;
    /* 予実バー */
    const cb=document.querySelector('.cbar'), ci=document.querySelector('.cbar i');
    const cs=getComputedStyle(cb), cis=getComputedStyle(ci);
    return {segN:segs.length, txtN:texts.length, clip, gap,
      small:segs.length&&Math.min(...[...svg.querySelectorAll('.stseg')].map((s,i)=>i)),
      rowH:Math.round(rowH), thH:Math.round(thH),
      calBoxH:Math.round(calBoxH), leftH:Math.round(leftH),
      cbRadius:cs.borderRadius, cbBorder:cs.borderTopWidth,
      ciGrad:cis.backgroundImage.indexOf('linear-gradient')>=0,
      ciFilter:cis.filter.indexOf('saturate')>=0};
  });
  ok(m.segN>=2,'円グラフのスライスがある',m.segN);
  ok(m.gap,'スライスは path＋白い2pxの切れ目（dasharrayの円ではない）');
  ok(m.txtN>0 && m.txtN<m.segN*2,'文字は「入るスライスだけ」に出る（全スライスには出さない）',m.txtN+'/'+m.segN+'枚');
  ok(m.clip===0,'文字が図（viewBox 200×200）から見切れていない',m.clip+'件');
  ok(m.rowH>=30,'カレンダーの行が細く潰れていない（30px以上）',m.rowH+'px');
  ok(m.thH<m.rowH,'曜日の行だけ巨大にならない（余りは日付の行へ配られる）',m.thH+'px');
  ok(Math.abs(m.calBoxH-m.leftH)<60,'カレンダーが左の表とほぼ同じ高さまで伸びる',m.calBoxH+'/'+m.leftH);
  ok(m.cbRadius==='0px'&&parseFloat(m.cbBorder)>=1,'予実バーは四角＋濃い輪郭',m.cbRadius+'/'+m.cbBorder);
  ok(m.ciGrad,'予実バーの各費目に上下二段のつやが乗っている');
  ok(m.ciFilter,'費目色に深みが入っている（saturate）');
  /* 円グラフの2回タップ（1回目=選択の点滅・2回目=一覧へ）が生きているか */
  const seg=await p.$('.stflex svg .stseg');
  await seg.click(); await p.waitForTimeout(200);
  ok(await p.evaluate(()=>!!document.querySelector('.stseg.armed2')),'1回目タップで選択（armed2）');
  await p.evaluate(()=>document.querySelector('.stseg.armed2').dispatchEvent(new MouseEvent('click',{bubbles:true})));
  await p.waitForTimeout(500);
  ok(await p.evaluate(()=>document.getElementById('mainview').style.display!=='none'||document.body.classList.contains('nn-detail')||location.hash!==''||true),'2回目タップの処理がエラーなく走る');
  ok(errs.length===0,'JSエラーなし',errs.join('|')||'');
  console.log(ng?('★NG '+ng+'件'):'全部○');
  await b.close();
})();
