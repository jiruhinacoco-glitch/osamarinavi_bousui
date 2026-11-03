/* §1030 現場記録帳の深い所まで総当たりで押す巡回：現場一覧→現場詳細（タブ・ボタン）→新規登録の窓 を、
   PC1400・PC2000（2列）・スマホ縦・スマホ横 で押して、JSエラー（pageerror）と「押すと固まる（2秒以上応答なし）」が無いかを見る。
   消す・印刷・PDF・書き出し・送信などは押さない。使い方: node _check/deepclick.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
const SKIP=/全削除|すべて削除|全消し|全部消す|削除|消す|印刷|PDF|書き出|リセット|初期化|クリア|ログアウト|送信|発注する|Excel|スマホ表示|PC表示|撮る|カメラ|写真を入れる|画像を貼る/;
(async()=>{const b=await chromium.launch();let NG=0;
const CASES=[['PC1400',{viewport:{width:1400,height:900}},0],['PC2000',{viewport:{width:2000,height:940}},0],['縦スマホ',{viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2},1],['横スマホ',{viewport:{width:852,height:393},isMobile:true,hasTouch:true,deviceScaleFactor:2},1]];
for(const [nm,opt,ph] of CASES){const ctx=await b.newContext({...opt,serviceWorkers:'block'});
 await ctx.addInitScript(ph=>{if(ph)localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');window.open=function(){return {document:{write(){},close(){}},focus(){},close(){}};};window.print=function(){};},ph);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,120)));p.on('dialog',d=>d.dismiss().catch(()=>{}));
 await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3500);
 const press=async(scopeSel,label)=>{let n=0,hang=[];
  const cnt=await p.evaluate(([s,re])=>{const R=new RegExp(re);window.__btns=[...document.querySelectorAll(s+' button, '+s+' [role="button"], '+s+' .tab, '+s+' [data-tab]')].filter(e=>{const st=getComputedStyle(e);const r=e.getBoundingClientRect();return st.display!=='none'&&st.visibility!=='hidden'&&r.width>6&&r.height>6&&!e.closest('nav')&&!R.test((e.textContent||'')+' '+(e.title||'')+' '+(e.id||''))&&!/location|href/.test(e.getAttribute('onclick')||'');}).slice(0,40);return window.__btns.length;},[scopeSel,SKIP.source]);
  for(let i=0;i<cnt;i++){const t0=Date.now();const r=await Promise.race([p.evaluate(i=>{const e=window.__btns[i];if(!e||!e.isConnected)return 'skip';try{e.click();}catch(x){return 'err';}return (e.textContent||'').trim().slice(0,10);},i),new Promise(r=>setTimeout(()=>r('HANG'),4000))]);
   if(r==='HANG'){hang.push(i);break;} n++; await p.waitForTimeout(120);
   await p.evaluate(()=>{const P=document.getElementById('nnSelPop');if(P&&P.classList.contains('open'))document.body.click();document.querySelectorAll('dialog[open]').forEach(d=>{try{d.close()}catch(e){}});});}
  return {label,n,hang};};
 const out=[];
 out.push(await press('#list .pcard:first-of-type','一覧の1枚目'));
 await p.evaluate(()=>{const c=document.querySelector('#list .pcard');if(window.nnGoDetail)nnGoDetail(+c.dataset.pid);});await p.waitForTimeout(1500);
 const dW=await p.evaluate(()=>{const D=document.getElementById('detail');return D?Math.round(D.getBoundingClientRect().width):0;});if(dW<200){errs.push('現場詳細が開かない（幅'+dW+'px）');}   /* ★§1032 */
 out.push(await press('#detail','現場詳細'));
 await p.evaluate(()=>{try{showView('list')}catch(e){}try{openModal()}catch(e){}});await p.waitForTimeout(1200);
 out.push(await press('#modalbg','新規登録の窓'));
 const hang=out.some(o=>o.hang.length);const ok=!errs.length&&!hang;if(!ok)NG++;
 console.log((ok?'○':'★NG')+' '+nm+'：押した数 '+out.map(o=>o.label+o.n).join('・')+(hang?' 固まり'+JSON.stringify(out.map(o=>o.hang)):'')+(errs.length?' JSエラー '+JSON.stringify([...new Set(errs)].slice(0,3)):''));
 await ctx.close();}
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
