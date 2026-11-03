/* §1033 現場記録帳ダッシュボードの今の形（左に目次・右に中身 §769）を端から押す：
   PC2000・PC1400・スマホ縦・スマホ横 で、目次の12項目を順に押し、
   ①押した項目が「選択中」になる ②中身の枠が出る（高さ40px以上）③中身が画面の横からはみ出さない（ページの横スクロールなし）
   ④見積済・契約高などのまとめ（.kgrp）が4つある ⑤JSエラーなし ⑥押してから固まらない（1.5秒以内に次を押せる）
   使い方: node _check/dashnav.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';let NG=0;
(async()=>{const b=await chromium.launch();
const CASES=[['PC2000',{viewport:{width:2000,height:940}},0],['PC1400',{viewport:{width:1400,height:900}},0],['縦スマホ',{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2},1],['横スマホ',{viewport:{width:852,height:393},isMobile:true,hasTouch:true,deviceScaleFactor:2},1]];
for(const [nm,opt,ph] of CASES){const ctx=await b.newContext({...opt,serviceWorkers:'block'});
 await ctx.addInitScript(ph=>{if(ph)localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','dash');},ph);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
 await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3500);
 const keys=await p.evaluate(()=>[...document.querySelectorAll('#dashboard .nn-dnav button[data-k]')].map(b=>b.dataset.k));
 const kg=await p.evaluate(()=>document.querySelectorAll('#dashboard .kgrp').length);
 const bad=[];
 for(const k of keys){const t0=Date.now();
  const r=await Promise.race([p.evaluate(k=>{const bt=document.querySelector('#dashboard .nn-dnav button[data-k="'+k+'"]');bt.click();
    return new Promise(res=>requestAnimationFrame(()=>setTimeout(()=>{const sel=document.querySelector('#dashboard .nn-dsel');const bt2=document.querySelector('#dashboard .nn-dnav button[data-k="'+k+'"]');const on=!!bt2&&bt2.classList.contains('on');
      const h=sel?Math.round(sel.getBoundingClientRect().height):0;const id=sel?(sel.dataset.panelId||''):'';
      res({on,h,id,ovf:document.documentElement.scrollWidth-document.documentElement.clientWidth});},150)));},k),new Promise(r=>setTimeout(()=>r('HANG'),5000))]);
  const ms=Date.now()-t0;
  if(r==='HANG'||!r.on||r.id!==k||r.h<40||r.ovf>2||ms>1500) bad.push({k,r,ms});}
 const ok=keys.length>=10&&kg===4&&!bad.length&&!errs.length;if(!ok)NG++;
 console.log((ok?'○':'★NG')+' '+nm+'：目次'+keys.length+'項目を順に押す・まとめ'+kg+'つ'+(bad.length?' 問題 '+JSON.stringify(bad).slice(0,300):'')+(errs.length?' JSエラー '+JSON.stringify(errs.slice(0,2)):''));
 await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
