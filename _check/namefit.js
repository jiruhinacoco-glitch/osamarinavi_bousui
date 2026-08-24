/* 物件名が1文字も隠れていないか／行が2つに割れていないか（全100件） */
try{ require('./mkland')(); }catch(_){}   /* ★よこ向き用のコピー _land.html を必ず自分で用意する */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const M=process.argv[2]||'land';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const vp=M==='pc'?{viewport:{width:2000,height:1010}}
      :M==='ph'?{viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true}
               :{viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true};
  const p=await b.newPage(vp);
  if(M!=='pc')await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+(M==='land'?'_land.html':'kirokucho_demo.html'));
  await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1500);
  const d=await p.evaluate(()=>{
    document.querySelectorAll('#list .pcard.nnoff').forEach(c=>c.classList.remove('nnoff'));
    document.body.offsetHeight;
    if(window.nnTtlFitAll)nnTtlFitAll();   /* 実機では IO が組み立て時に同じ文字合わせを行う */
    const Z=window.nnPZ||1, out={cut:[], split:[], lines:{}, hMax:0, over:0};
    document.querySelectorAll('#list .pcard').forEach(c=>{
      const t=c.querySelector('.ebox.ttl'), h=c.querySelector('.rhead');
      /* 隠れていないか＝中身の幅・高さが箱に収まっているか */
      if(t.scrollWidth>t.clientWidth+1 || t.scrollHeight>t.clientHeight+1) out.cut.push(t.textContent);
      /* 行が2つに割れていないか＝いちばん背の高い部品と行の高さを比べる */
      const hs=getComputedStyle(h), pad=parseFloat(hs.paddingTop)+parseFloat(hs.paddingBottom);
      const kids=[...h.children].map(e=>e.getBoundingClientRect());
      const maxKid=Math.max(...kids.map(k=>k.height));
      if((h.getBoundingClientRect().height-pad) > maxKid+3) out.split.push(t.textContent);
      /* 部品どうしの重なり */
      for(let i=0;i<kids.length;i++)for(let j=i+1;j<kids.length;j++)
        if(kids[i].left<kids[j].right-0.5&&kids[j].left<kids[i].right-0.5) out.over++;
      const ln=Math.round(t.getBoundingClientRect().height/(parseFloat(getComputedStyle(t).lineHeight)||18));
      out.lines[ln]=(out.lines[ln]||0)+1;
      out.hMax=Math.max(out.hMax, Math.round(c.getBoundingClientRect().height/Z));
    });
    return out;
  });
  const ok=(n,c,ex)=>console.log((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
  ok('物件名が1文字も隠れていない（100件）', d.cut.length===0, d.cut.slice(0,2).join(' / '));
  ok('現場名の行が2つに割れない（部品はすべて横並び）', d.split.length===0, d.split.slice(0,2).join(' / '));
  ok('部品どうしが重ならない', d.over===0, d.over+'件');
  ok('名前の段数（1段＝そのまま／2段＝長い名前）', true, JSON.stringify(d.lines));
  ok('カードのいちばんの高さ', true, d.hMax+'px');
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  await b.close();
})();
