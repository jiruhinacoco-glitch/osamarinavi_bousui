/* 現場記録帳ダッシュボード（スマホ表示）：帯の見出しが平行四辺形の枠に収まるか・2行に折れないか。
   本人の実機写真（2026-09-24「完成工事の予／実」が枠の上へはみ出し）から作った検査。幅 360/375/393/430 で測る。
   使い方: node _check/dash_titles.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE=process.argv[2]||'kirokucho_demo.html';
let ng=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const w of [360,375,393,430]){
    const ctx=await b.newContext({viewport:{width:w,height:900},isMobile:true,hasTouch:true,deviceScaleFactor:2,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
    await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
    const p=await ctx.newPage(); await p.goto('http://localhost:8899/'+PAGE);
    await p.waitForFunction(()=>document.querySelectorAll('#dashboard .dpanel h4 .httl').length>5);
    await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(300);
    const r=await p.evaluate(()=>[...document.querySelectorAll('#dashboard .dpanel h4 .httl')].map(f=>{
      const F=f.getBoundingClientRect();const rg=document.createRange();
      const tn=[];const tw=document.createTreeWalker(f,NodeFilter.SHOW_TEXT);let n;while((n=tw.nextNode()))if(n.nodeValue.trim()&&getComputedStyle(n.parentElement).display!=='none')tn.push(n);
      const rs=tn.flatMap(n=>{rg.selectNodeContents(n);return [...rg.getClientRects()].filter(q=>q.width>1);});
      const lines=new Set(rs.map(q=>Math.round(q.top))).size;
      return {t:f.textContent.trim().slice(0,12),out:Math.round(Math.max(...rs.map(q=>q.right))-F.right),up:Math.round(F.top-Math.min(...rs.map(q=>q.top))),lines};}));
    const bad=r.filter(x=>x.out>0||x.up>2||x.lines>1);
    ok(!bad.length,`幅${w}：見出し${r.length}本が枠の中・1行 `+bad.map(x=>`「${x.t}」右へ${x.out}px 上へ${x.up}px ${x.lines}行`).join(' / '));
    await ctx.close();
  }
  await b.close(); console.log(ng?'★NG '+ng+'件':'全項目○');
})();
