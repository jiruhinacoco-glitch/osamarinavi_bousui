/* 整理の確かめ（全部のカード）：2つの版で、一覧の100枚すべて（後回しのカードも組み立ててから）の見た目の値を突き合わせる。
   使い方: node _check/_tools/fullcss_diff.js <前の版.html> <後の版.html>   （どちらもリポジトリ直下に置いて http で開く）
   ★ overcss.js（先頭6枚だけ）で見つからなかった「後ろのカードだけで効く決まり」を拾うため。 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const [A,B]=process.argv.slice(2);
const UAP='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const UAI='Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ST=[['ph_m',{viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:UAP},1],
 ['ph_i',{viewport:{width:390,height:844},screen:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:UAP},0],
 ['ipad',{viewport:{width:820,height:1180},screen:{width:820,height:1180},isMobile:true,hasTouch:true,userAgent:UAI},0],
 ['pc1366',{viewport:{width:1366,height:768}},0],['pc1500',{viewport:{width:1500,height:900}},0],['pc2000',{viewport:{width:2000,height:1000}},0]];
const P=['display','position','top','left','width','height','margin-top','margin-left','margin-right','padding-top','padding-left','padding-right','padding-bottom','font-size','font-weight','line-height','color','background-color','background-image','background-size','background-position','border-top-width','border-left-width','border-top-color','flex-basis','flex-grow','flex-wrap','grid-template-columns','grid-column-start','grid-column-end','grid-row-start','justify-content','align-items','white-space','overflow-x','transform','opacity','visibility','box-shadow','text-align','letter-spacing','z-index','max-width','min-width','gap','content','scale','translate','filter','object-fit','vertical-align'];
async function grab(b,file,dev,mob){ const ctx=await b.newContext({...dev,deviceScaleFactor:1,serviceWorkers:'block'});
  await ctx.addInitScript(m=>{ if(m) localStorage.setItem('nn_view_mode','mobile'); sessionStorage.setItem('nn_vm_view','list'); },mob);
  const p=await ctx.newPage(); await p.goto('http://localhost:8899/'+file); await p.waitForTimeout(3500);
  /* 後回しのカードを順に画面へ送り、全部組み立てる */
  const n=await p.evaluate(()=>document.querySelectorAll('#list .pcard').length);
  for(let i=0;i<n;i+=3){ await p.evaluate(i=>{ const c=document.querySelectorAll('#list .pcard')[i]; c&&c.scrollIntoView({block:'start'}); },i); await p.waitForTimeout(120); }
  await p.waitForTimeout(1200);
  const r=await p.evaluate(P=>{ const out={}; document.querySelectorAll('#list .pcard').forEach((c,ci)=>{ c.querySelectorAll('*').forEach((e,ei)=>{ const cs=getComputedStyle(e); let s=''; for(const k of P) s+=cs.getPropertyValue(k)+'|';
      const bf=getComputedStyle(e,'::before'); if(bf.content!=='none'&&bf.content!=='normal') s+='B'+bf.content+bf.width+bf.backgroundColor;
      out[(c.dataset.pid||ci)+':'+ei+':'+e.tagName+'.'+(typeof e.className==='string'?e.className:'')]=s; }); }); return out; },P);
  await ctx.close(); return r; }
(async()=>{ const b=await chromium.launch(); let NG=0;
 for(const [nm,dev,mob] of ST){ const a=await grab(b,A,dev,mob), c=await grab(b,B,dev,mob);
   const keys=new Set([...Object.keys(a),...Object.keys(c)]); const diff=[]; const byP={}; for(const k of keys){ if(a[k]!==c[k]){ diff.push(k); const x=(a[k]||'').split('|'), y=(c[k]||'').split('|'); P.forEach((pp,i)=>{ if(x[i]!==y[i]){ byP[pp]=(byP[pp]||0)+1; } }); if(x.length!==y.length||x[P.length]!==y[P.length]) byP['::before']=(byP['::before']||0)+1; } }
   if(process.env.DETAIL) console.log('   項目ごと',JSON.stringify(byP));
   if(diff.length) NG++; console.log((diff.length?'★NG ':'○ ')+nm+' 部品'+Object.keys(a).length+' 違い'+diff.length+(diff.length?' 例 '+diff.slice(0,4).join(' / '):'')); }
 console.log(NG?'★NG '+NG+'件':'全部○'); await b.close(); })();
