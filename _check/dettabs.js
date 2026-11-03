/* §1033 現場詳細のタブ（概要・写真・保管資料・作成図面・人工・追加工事・エクスポート）を全部開く：
   PC2000・PC1400・スマホ縦・スマホ横 で、①タブが切り替わる ②中身が出る（高さ40px以上）③ページが横にはみ出さない ④JSエラーなし。
   使い方: node _check/dettabs.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';let NG=0;
(async()=>{const b=await chromium.launch();
const CASES=[['PC2000',{viewport:{width:2000,height:940}},0],['PC1400',{viewport:{width:1400,height:900}},0],['縦スマホ',{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2},1],['横スマホ',{viewport:{width:852,height:393},isMobile:true,hasTouch:true,deviceScaleFactor:2},1]];
for(const [nm,opt,ph] of CASES){const ctx=await b.newContext({...opt,serviceWorkers:'block'});
 await ctx.addInitScript(ph=>{if(ph)localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');window.open=function(){return {document:{write(){},close(){}},focus(){},close(){}};};},ph);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,100)));p.on('dialog',d=>d.dismiss().catch(()=>{}));
 await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3500);
 await p.evaluate(()=>nnGoDetail(+document.querySelector('#list .pcard').dataset.pid));await p.waitForTimeout(1500);
 const tabs=await p.evaluate(()=>{const D=document.getElementById('detail');return [...D.querySelectorAll('.tabs button, .tab, [data-tab], .dtabs button')].filter(x=>x.offsetWidth).map(x=>x.textContent.trim().slice(0,8));});
 const bad=[];
 for(const t of tabs){const r=await p.evaluate(t=>{const D=document.getElementById('detail');const bt=[...D.querySelectorAll('.tabs button, .tab, [data-tab], .dtabs button')].find(x=>x.offsetWidth&&x.textContent.trim().startsWith(t));if(!bt)return {miss:1};bt.click();
   return new Promise(res=>setTimeout(()=>{const tb=D.querySelector('.tabbody, .tbody, .tabc, [class*=tabbody]');const h=tb?Math.round(tb.getBoundingClientRect().height):-1;res({cur:typeof curTab!=='undefined'?curTab:'',h,ovf:document.documentElement.scrollWidth-document.documentElement.clientWidth,dsw:D.scrollWidth-D.clientWidth});},500));},t);
  if(r.miss||r.h===-1||(r.h>=0&&r.h<40)||r.ovf>2) bad.push({t,...r});}
 const ok=tabs.length>=5&&!bad.length&&!errs.length;if(!ok)NG++;
 console.log((ok?'○':'★NG')+' '+nm+'：詳細のタブ'+tabs.length+'個（'+tabs.join('・')+'）'+(bad.length?' 問題 '+JSON.stringify(bad).slice(0,300):'')+(errs.length?' JSエラー '+JSON.stringify(errs.slice(0,2)):''));
 await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
