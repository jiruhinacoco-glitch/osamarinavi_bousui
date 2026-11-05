/* 重なりの整理：本物の <style> の葉の決まりを止めてみて、どの部品の見た目の値も変わらないもの（＝後の決まりに上書きされて働いていない）を探す。
   使い方: node _check/_tools/overcss.js <blocks.json> <結果.json> [状態の名前をカンマ区切り]
   ・状態（端末×画面）ごとに順に調べ、前の状態で「消せる」と残ったものだけを次で調べ直す（全部の状態で消せるものだけ残る）。
   ・その状態で「当てはまる部品があり・@media も効いている」決まりだけを試す（試せなかった決まりは消さない）。
   ・:hover／:focus など押している間だけの決まりは試さない（消さない）。 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const fs=require('fs');
const BL=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const OUT=process.argv[3];
const FILE=process.env.FILE||'kirokucho_demo.html';
const UAP='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const UAI='Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const DEV={ph:{viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:UAP},
  phl:{viewport:{width:852,height:393},screen:{width:852,height:393},isMobile:true,hasTouch:true,userAgent:UAP},
  ipad:{viewport:{width:820,height:1180},screen:{width:820,height:1180},isMobile:true,hasTouch:true,userAgent:UAI},
  ipadl:{viewport:{width:1180,height:820},screen:{width:1180,height:820},isMobile:true,hasTouch:true,userAgent:UAI},
  pc1100:{viewport:{width:1100,height:800}},pc1366:{viewport:{width:1366,height:768}},pc1600:{viewport:{width:1600,height:900}},pc2000:{viewport:{width:2000,height:1000}}};
const ALL=[];
for(const d of ['ph_m','ph_i','phl_m','ipad','ipadl','pc1100','pc1366','pc1600','pc2000']) for(const v of ['list','dash','detail','form']) ALL.push(d+':'+v);
ALL.push('pc2000:table','ph_m:table');
const STATES=(process.argv[4]?process.argv[4].split(','):ALL);
(async()=>{const b=await chromium.launch();
 /* 候補：全部の葉の決まり（番号＝ブロック番号:決まり番号） */
 let cand=null; const proven=new Set(); const log=[];
 if(fs.existsSync(OUT)){ const o=JSON.parse(fs.readFileSync(OUT,'utf8')); cand=new Set(o.cand); o.proven.forEach(x=>proven.add(x)); o.log.forEach(x=>log.push(x)); }
 for(const st of STATES){ if(log.some(l=>l.st===st)) continue;
  const [dv,view]=st.split(':'); const dev=dv.replace(/_[mi]$/,''); const mob=/_m$/.test(dv);
  const ctx=await b.newContext({...DEV[dev],deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.addInitScript(([mob,view])=>{ try{ if(mob) localStorage.setItem('nn_view_mode','mobile'); sessionStorage.setItem('nn_vm_view',view==='dash'?'dash':'list'); }catch(e){} },[mob,view]);
  const p=await ctx.newPage(); p.on('dialog',d=>d.dismiss().catch(()=>{}));
  await p.goto('http://localhost:8899/'+FILE); await p.waitForTimeout(3500);
  if(view==='detail'){ await p.evaluate(()=>nnGoDetail(props[0].id)); await p.waitForTimeout(1500); }
  if(view==='form'){ await p.evaluate(()=>openModal(props[0].id)); await p.waitForTimeout(1500); }
  if(view==='table'){ await p.evaluate(()=>{ const x=[...document.querySelectorAll('button,[role=button]')].find(e=>/表一覧/.test(e.textContent)); x&&x.click(); }); await p.waitForTimeout(1500); }
  await p.evaluate(()=>{ const st=document.createElement('style'); st.id='__nnfreeze'; st.textContent='*,*::before,*::after{animation:none !important; transition:none !important;}'; document.head.appendChild(st); });
  await p.waitForTimeout(500);
  const t0=Date.now();
  const r=await p.evaluate(async([BL,candArr])=>{
   /* ブロックと CSSOM を本文で突き合わせる */
   const norm=s=>s.replace(/["'\s]/g,'').replace(/::?(before|after|placeholder|selection|first-line|first-letter|marker)\b/g,'::$1');
   const sheets=[...document.querySelectorAll('style')].filter(e=>e.id!=='__nnfreeze');
   const R=[];   /* {id, rule, media[]} */
   const miss=[];
   BL.forEach((blk,bi)=>{ const el=sheets.find(e=>e.textContent===blk.text); if(!el||!el.sheet){ miss.push(bi); return; }
     const leaves=[]; (function walk(list,med){ for(const ru of list){ if(ru.type===1) leaves.push({ru,med}); else if(ru.type===4||ru.type===12) walk(ru.cssRules,med.concat([ru.type===4?ru.media.mediaText:('supports '+ru.conditionText)])); } })(el.sheet.cssRules,[]);
     /* 葉の並びを選び方で突き合わせる（同じ数・同じ選び方の時だけ使う） */
     if(leaves.length!==blk.rules.length||leaves.some((l,i)=>norm(l.ru.selectorText)!==blk.rules[i].n)){ miss.push(bi); return; }
     leaves.forEach((l,i)=>R.push({id:bi+':'+i,ru:l.ru,med:l.med})); });
   /* 見た目の値を集める（カードは先頭6枚、表は先頭12行まで） */
   const P=['display','position','top','left','right','bottom','width','height','min-width','max-width','min-height','max-height','margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-left-color','border-top-style','border-radius','background-color','background-image','color','font-size','font-weight','font-family','line-height','letter-spacing','text-align','white-space','overflow-x','overflow-y','flex-direction','flex-wrap','flex-grow','flex-shrink','flex-basis','order','grid-template-columns','grid-template-rows','grid-column-start','grid-column-end','grid-row-start','grid-row-end','column-gap','row-gap','justify-content','align-items','align-self','justify-self','opacity','visibility','transform','box-shadow','z-index','text-overflow','vertical-align','object-fit','filter','text-decoration-line','-webkit-text-stroke-width','content','cursor','pointer-events','box-sizing','outline-style','text-shadow','clip-path','-webkit-line-clamp','word-break','writing-mode','float','list-style-type','table-layout','border-collapse','inset'];
   const PS=['content','display','width','height','background-color','background-image','color','font-size','position','top','left','border-top-width','margin-left','margin-right','padding-left','flex-basis','transform','align-self'];
   const els=[...document.querySelectorAll('body *')].filter(e=>{ const c=e.closest('.pcard'); if(c){ const cs=[...c.parentNode.children]; if(cs.indexOf(c)>=6) return false; } const tr=e.closest('tbody tr'); if(tr&&[...tr.parentNode.children].indexOf(tr)>=12) return false; return true; });
   const snap=()=>{ const out=[]; for(const e of els){ const cs=getComputedStyle(e); let s=''; for(const k of P) s+=cs.getPropertyValue(k)+'|'; const b=getComputedStyle(e,'::before'), a=getComputedStyle(e,'::after');
       if(b.content!=='none'&&b.content!=='normal'){ for(const k of PS) s+=b.getPropertyValue(k)+'|'; } if(a.content!=='none'&&a.content!=='normal'){ for(const k of PS) s+=a.getPropertyValue(k)+'|'; } out.push(s); } return out.join('\n'); };
   const base=snap();
   /* 試せる決まり：候補の中で、@media が効いていて・当てはまる部品がある・押している間だけの決まりでない */
   const cset=candArr?new Set(candArr):null;
   const clean=sel=>sel.split(',').map(x=>x.replace(/::?(before|after|placeholder|selection|first-line|first-letter|marker|-webkit-[\w-]+)\b/g,'').trim()).filter(Boolean);
   const testable=R.filter(x=>{ if(cset&&!cset.has(x.id)) return false; if(/:(hover|active|focus|focus-visible|focus-within|visited|checked|disabled|placeholder-shown|target)/.test(x.ru.selectorText)) return false;
     if(!x.med.every(m=>/^supports /.test(m)||matchMedia(m).matches)) return false;
     try{ return clean(x.ru.selectorText).some(s=>document.querySelector(s)); }catch(e){ return false; } });
   const saved=new Map(); const off=g=>g.forEach(x=>{ saved.set(x.id,x.ru.style.cssText); x.ru.style.cssText=''; }); const on=g=>g.forEach(x=>{ x.ru.style.cssText=saved.get(x.id); });
   const keepOff=[]; let tests=0;
   const tryG=g=>{ tests++; off(g); const same=snap()===base; if(same){ keepOff.push(...g); return; } on(g); if(g.length>1){ const h=g.length>>1; tryG(g.slice(0,h)); tryG(g.slice(h)); } };
   for(let i=0;i<testable.length;i+=48) tryG(testable.slice(i,i+48));
   on(keepOff);
   return {all:R.length,miss,testable:testable.map(x=>x.id),removable:keepOff.map(x=>x.id),tests,els:els.length};
  },[BL,cand?[...cand]:null]);
  /* 候補を絞る：この状態で試せて「変わった」ものは外す。試せなかったものは候補のまま */
  const rem=new Set(r.removable); const tested=new Set(r.testable);
  if(!cand){ cand=new Set(); BL.forEach((blk,bi)=>blk.rules.forEach((x,i)=>cand.add(bi+':'+i))); r.miss.forEach(bi=>{ BL[bi].rules.forEach((x,i)=>cand.delete(bi+':'+i)); }); }
  for(const id of [...cand]){ if(tested.has(id)&&!rem.has(id)) cand.delete(id); }
  r.removable.forEach(x=>proven.add(x));
  log.push({st,secs:Math.round((Date.now()-t0)/1000),els:r.els,tests:r.tests,testable:r.testable.length,removable:r.removable.length,miss:r.miss.length,cand:cand.size});
  console.log(st,JSON.stringify(log[log.length-1]));
  fs.writeFileSync(OUT,JSON.stringify({cand:[...cand],proven:[...proven],log}));
  await ctx.close(); }
 const fin=[...cand].filter(x=>proven.has(x));
 console.log('消せる（どこかの状態で試せて、全部の状態で変わらなかった）',fin.length);
 await b.close();})();
