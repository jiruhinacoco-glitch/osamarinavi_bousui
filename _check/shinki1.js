/* 検査：①ヘッダー「＋ 新規作成」が必ず1行 ②新規登録の同じ行の入力枠が一直線 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const FILE=process.argv[2]||'kirokucho_demo.html';
let ng=0;
const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [lbl,vp,mob] of [['PC1920',{width:1920,height:1080},0],['PC1440',{width:1440,height:900},0],
      ['PC1280',{width:1280,height:800},0],['PC1024',{width:1024,height:800},0],['PC900',{width:900,height:800},0],
      ['PC820',{width:820,height:800},0],['PC768',{width:768,height:800},0],['スマホ393',{width:393,height:852},1]]){
    const ctx=await b.newContext({viewport:vp,isMobile:!!mob,hasTouch:!!mob,userAgent:mob?UA:undefined});
    const p=await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
    await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>!!document.querySelector('header button.new-btn.newbig'));
    await p.waitForTimeout(900);
    const m=await p.evaluate(()=>{
      function lines(el){const r=document.createRange();r.selectNodeContents(el);
        const rs=[...r.getClientRects()].filter(x=>x.width>0.5&&x.height>0.5);
        return new Set(rs.map(x=>Math.round(x.top))).size;}
      const btn=document.querySelector('header button.new-btn.newbig');
      const cnt=document.querySelector('header .count');
      const de=document.documentElement;
      return {bl:lines(btn), cl:lines(cnt), xscroll:de.scrollWidth-de.clientWidth,
              hdrRight:+document.querySelector('header').getBoundingClientRect().right.toFixed(1)};
    });
    ok(m.bl===1, lbl+' ヘッダーの「＋ 新規作成」が1行（実測 '+m.bl+'行）');
    ok(m.cl===1, lbl+' ヘッダーの件数が1行（実測 '+m.cl+'行）');
    ok(m.xscroll<=1, lbl+' 画面が横にはみ出していない（'+m.xscroll+'px）');
    // モーダル
    await p.evaluate(()=>openModal());
    await p.waitForTimeout(500);
    const g=await p.evaluate(()=>{
      const mis=[];
      document.querySelectorAll('.modal-bg .modal .mgrid').forEach(gr=>{
        const cells=[...gr.children].filter(c=>!c.classList.contains('full'));
        const byRow={};
        cells.forEach(c=>{const r=c.getBoundingClientRect(); (byRow[Math.round(r.top)]=byRow[Math.round(r.top)]||[]).push(c);});
        Object.values(byRow).forEach(row=>{ if(row.length<2)return;
          const tops=row.map(c=>{const f=c.querySelector('input,select,button'); return f?Math.round(f.getBoundingClientRect().top):null;}).filter(x=>x!=null);
          if(new Set(tops).size>1) mis.push(row.map(c=>((c.querySelector('label')||{}).textContent||'').trim().slice(0,12)).join('／')+' tops='+tops.join(','));
        });
      });
      // 重なり（入力欄どうし・ラベルと入力欄）
      const els=[...document.querySelectorAll('.modal-bg .modal .mgrid label, .modal-bg .modal .mgrid input, .modal-bg .modal .mgrid select, .modal-bg .modal .mgrid button')]
        .filter(e=>{const r=e.getBoundingClientRect();return r.width>3&&r.height>3;});
      const ov=[];
      for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){
        const A=els[i].getBoundingClientRect(),C=els[j].getBoundingClientRect();
        const ox=Math.min(A.right,C.right)-Math.max(A.left,C.left);
        const oy=Math.min(A.bottom,C.bottom)-Math.max(A.top,C.top);
        if(ox>3&&oy>3) ov.push(((els[i].textContent||els[i].placeholder||els[i].id)+'').trim().slice(0,12)+'×'+((els[j].textContent||els[j].placeholder||els[j].id)+'').trim().slice(0,12));
      }
      return {mis,ov:ov.slice(0,5)};
    });
    ok(g.mis.length===0, lbl+' 新規登録：同じ行の入力枠が一直線（ずれ '+g.mis.length+'件 '+g.mis.slice(0,2).join(' / ')+'）');
    ok(g.ov.length===0, lbl+' 新規登録：ラベルと入力欄の重なりなし（'+g.ov.length+'件 '+g.ov.join(' / ')+'）');
    ok(errs.length===0, lbl+' JSエラーなし（'+errs.join(' / ')+'）');
    await ctx.close();
  }
  await b.close();
  console.log(ng?('★NG 合計 '+ng):'○ 全項目OK');
})();
