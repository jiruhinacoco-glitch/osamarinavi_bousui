/* 図面・積算：方眼のスケール表示が案内ふきだしに隠れていないか＋⊡全体表示が使えるか（2026-09-13m）
   使い方: node _check/zubot.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 '+
         '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+x:'')); if(!c)ng++;};

(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [lbl,vp,mob] of [['PC',{width:1440,height:900},0],['スマホ',{width:393,height:852},1]]){
    const ctx=await b.newContext({viewport:vp,isMobile:!!mob,hasTouch:!!mob,userAgent:mob?UA:undefined});
    const p=await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
    await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
    await p.waitForSelector('.zmGoB[data-go="zu"]',{timeout:20000});
    await p.click('.zmGoB[data-go="zu"]');
    await p.waitForFunction(()=>typeof loadSample==='function'&&typeof draw==='function');
    await p.evaluate(()=>loadSample());
    await p.waitForTimeout(900);

    /* ① スケールの行（キャンバスに描く文字）が、案内ふきだしに隠れていないか。
       「どこに描いたか」は product の関数を使わず、キャンバスの画素を自分で数えて確かめる。 */
    const r=await p.evaluate(()=>{
      const cv=document.getElementById('cv')||document.querySelector('canvas');
      const cr=cv.getBoundingClientRect();
      const ht=document.getElementById('hint');
      const hs=ht?getComputedStyle(ht):null;
      const shown=!!(ht&&ht.offsetParent&&hs.display!=='none'&&hs.visibility!=='hidden');
      const hr=shown?ht.getBoundingClientRect():null;
      /* キャンバスの下1/4で「文字の色（濃いグレー）」の画素がある一番下の行を探す */
      const c2=document.createElement('canvas');
      const W=Math.round(cr.width), H=Math.round(cr.height);
      c2.width=W; c2.height=H;
      const g=c2.getContext('2d'); g.drawImage(cv,0,0,W,H);
      const d=g.getImageData(0,Math.max(0,H-160),Math.min(260,W),Math.min(160,H)).data;
      let lowest=-1, rowW=Math.min(260,W);
      for(let y=0;y<Math.min(160,H);y++)for(let x=0;x<rowW;x++){
        const i=(y*rowW+x)*4;
        const rr=d[i],gg=d[i+1],bb=d[i+2],aa=d[i+3];
        /* 方眼の線は水色（青がいちばん強い）、紙はほぼ白。
           スケールの文字だけが「青が赤より弱い、白くない色」になる。
           ※product の色の定義は使わず、画素そのもので見分ける。 */
        if(aa>100 && rr<205 && gg<205 && bb<rr+14){ if(y>lowest) lowest=y; }
      }
      return {crTop:cr.top, crH:cr.height, shown,
        hintTopRel: hr? hr.top-cr.top : null, hintBotRel: hr? hr.bottom-cr.top : null,
        hintLeftRel: hr? hr.left-cr.left : null,
        textBottomRel: lowest<0? null : (Math.max(0,H-160)+lowest)};
    });
    if(r.shown && r.hintLeftRel<40){
      ok(r.textBottomRel!=null && r.textBottomRel<=r.hintTopRel,
        lbl+' 方眼のスケール表示が案内ふきだしの上にある',
        JSON.stringify({文字の下端:r.textBottomRel,ふきだしの上端:Math.round(r.hintTopRel)}));
    }else{
      ok(true, lbl+' 案内ふきだしが左下に出ていないので、この項目は対象外');
    }

    /* ② ⊡全体表示が「押せる場所にある」か（＋押すと実際に表示が変わるか） */
    const f=await p.evaluate(async()=>{
      const btn=document.getElementById('tl_fit');
      if(!btn) return {exists:false};
      /* 「その他」を開く */
      const more=document.getElementById('tl_more'); if(more) more.click();
      await new Promise(r=>setTimeout(r,250));
      const vis=!!btn.offsetParent && btn.getBoundingClientRect().width>4;
      /* わざと遠くへずらしてから押す */
      ox=-99999; oy=-99999; cellPx=3; draw();
      const before={ox,oy,cellPx};
      btn.click();
      await new Promise(r=>setTimeout(r,250));
      return {exists:true, vis, before, after:{ox,oy,cellPx}};
    });
    ok(f.exists, lbl+' ⊡全体表示のボタンがある');
    ok(!!f.vis, lbl+' ⊡全体表示が「⋯ その他」を開くと出てくる');
    ok(f.after && f.after.cellPx>f.before.cellPx && Math.abs(f.after.ox)<1e5,
       lbl+' ⊡全体表示を押すと図面が画面内に戻る', JSON.stringify(f.after));

    /* ③ 戻したあと、かいたものが本当に画面の中に入っているか（自分で計算して確かめる） */
    const inside=await p.evaluate(()=>{
      const cv=document.getElementById('cv')||document.querySelector('canvas');
      const W=cv.width/devicePixelRatio, H=cv.height/devicePixelRatio;
      let bad=0,n=0;
      state.polys.forEach(pl=>pl.pts.forEach(q=>{ n++;
        const X=ox+q.x*cellPx, Y=oy+q.y*cellPx;
        if(X<0||Y<0||X>W||Y>H) bad++; }));
      return {bad,n};
    });
    ok(inside.n>0 && inside.bad===0, lbl+' 全体表示のあと、頂点が全部画面の中にある', JSON.stringify(inside));
    ok(errs.length===0, lbl+' JSエラーなし', errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(ng?('★NG 合計 '+ng):'○ 全項目OK');
  process.exit(0);
})();
