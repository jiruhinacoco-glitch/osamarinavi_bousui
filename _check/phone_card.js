/* 現場記録帳（スマホ）：カードの「くわしく」を開いた状態・提出書類の絵・右下▲の大きさ（2026-09-24 本人の実機写真4枚）。
   ① スマホ表示で「くわしく」を開くと、中身（提出書類の表・写真枠・金額）がカードの外へ出ない（幅375/393/430）
   ② 提出書類の絵7枚が2秒以内に全部出る／1枚100KB以下（元は1枚0.9〜1.5MBで出るまで時間がかかっていた）
   ③ 一覧表示（幅980を縮めた画面）でも、右下の▲が画面上で36pt以上
   使い方: node _check/phone_card.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE=process.argv[2]||'kirokucho_demo.html';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
let ng=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const w of [375,393,430]){
    const ctx=await b.newContext({viewport:{width:w,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA});
    await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
    const p=await ctx.newPage();const sizes=[];
    p.on('response',async r=>{if(/icons\/doc_/.test(r.url())){try{sizes.push([r.url().split('/').pop(),(await r.body()).length]);}catch(e){}}});
    await p.goto('http://localhost:8899/'+PAGE);await p.waitForFunction(()=>document.getElementById('vt_list'));
    await p.evaluate(()=>document.getElementById('vt_list').click());
    await p.waitForFunction(()=>document.querySelectorAll('#list .pcard .sp-more').length>=3);
    const t0=Date.now();
    await p.evaluate(()=>[...document.querySelectorAll('#list .pcard')].slice(0,3).forEach(c=>c.querySelector('.sp-more').click()));
    const loaded=await p.waitForFunction(()=>{const im=[...document.querySelector('#list .pcard .doc-matrix').querySelectorAll('img')];return im.length===7&&im.every(i=>i.complete&&i.naturalWidth>0);},null,{timeout:4000}).then(()=>true).catch(()=>false);
    const ms=Date.now()-t0;
    const r=await p.evaluate(()=>{const out=[];[...document.querySelectorAll('#list .pcard')].slice(0,3).forEach((c,ci)=>{const C=c.getBoundingClientRect();
      c.querySelectorAll('*').forEach(e=>{if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')return;const R=e.getBoundingClientRect();if(!R.width||!R.height)return;
        /* 横スクロールの枠の中は、その枠で見えている範囲だけ */
        for(let a=e.parentElement;a&&a!==c;a=a.parentElement){if(/auto|scroll|hidden/.test(getComputedStyle(a).overflowX))return;}
        if(R.right>C.right+1||R.left<C.left-1)out.push(ci+':'+e.tagName+'.'+String(e.className).split(' ')[0]+' '+Math.round(R.left)+'-'+Math.round(R.right)+'/'+Math.round(C.right));});
      const m=c.querySelector('.doc-matrix');const M=m.getBoundingClientRect();if(M.right>C.right+1)out.push(ci+':提出書類 '+Math.round(M.right)+'/'+Math.round(C.right));
      [...m.querySelectorAll('th span')].forEach(s=>{const S=s.getBoundingClientRect(),T=s.closest('th').getBoundingClientRect();if(S.right>T.right+1||S.left<T.left-1)out.push(ci+':見出し「'+s.textContent+'」切れ');});});
      return [...new Set(out)];});
    ok(!r.length,`幅${w}：「くわしく」を開いてもカードの外へ出ない・提出書類7列の見出しが切れない `+r.slice(0,6).join(' / '));
    ok(loaded&&ms<2000,`幅${w}：提出書類の絵7枚が出る（${ms}ms）`);
    if(w===393){const big=sizes.filter(s=>s[1]>100000);ok(sizes.length>0&&!big.length,'提出書類の絵が1枚100KB以下 '+sizes.map(s=>s[0].split('?')[0]+':'+Math.round(s[1]/1024)+'KB').join(' '));}
    await ctx.close();
  }
  // ③ 一覧表示（スマホ表示でない＝幅980を縮めた画面）の▲
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:3,userAgent:UA});
  await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','ichiran');}catch(e){}});
  const p=await ctx.newPage();await p.goto('http://localhost:8899/'+PAGE);
  await p.waitForFunction(()=>document.getElementById('navShowTab'));
  const pt=await p.waitForFunction(()=>{const t=document.getElementById('navShowTab');const w=t.getBoundingClientRect().width||parseFloat(getComputedStyle(t).width);return w*screen.width/document.documentElement.clientWidth>=36?w*screen.width/document.documentElement.clientWidth:0;},null,{timeout:4000}).then(h=>h.jsonValue()).catch(async()=>p.evaluate(()=>{const t=document.getElementById('navShowTab');return parseFloat(getComputedStyle(t).width)*screen.width/document.documentElement.clientWidth;}));
  ok(pt>=36,'一覧表示（幅980の画面）でも右下の▲が画面上で36pt以上（'+Math.round(pt)+'pt）');
  await b.close();console.log(ng?'★NG '+ng+'件':'全項目○');
})();
