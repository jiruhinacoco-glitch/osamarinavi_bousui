/* §1437 入口の画面（看板5枚）：スマホの たて・よこ で全部が画面に入る／看板に「利用用途｜現場調査｜見積依頼」
   ①看板5枚と説明の帯が、ナビより上・スクロールなしで入る（たて 393×852・375×667／よこ 852×393・667×375）
   ②できること のある4枚に 利用用途（現場調査・見積依頼）がある・役物作成には無い
   ③利用用途の札が、できること の丸・文字、題名の字、▶ と重ならず、画面の中にある（パソコンも）
   直す前の版は★NG。使い方: node _check/zmpick5.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
for(const c of [['スマホたて 393×852',393,852,1],['スマホたて 375×667',375,667,1],['スマホよこ 852×393',852,393,1],['スマホよこ 667×375',667,375,1],['PC 1500×900',1500,900,0]]){
 const ctx=await b.newContext(c[3]?{viewport:{width:c[1],height:c[2]},isMobile:true,hasTouch:true,userAgent:UA}:{viewport:{width:c[1],height:c[2]}});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
 await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1800);
 await p.evaluate(()=>{ nnZMenuOpen(); nnZMenuPick(''); }); await p.waitForTimeout(900);
 const m=await p.evaluate(()=>{ const e=document.getElementById('nnZMenu'), nav=document.getElementById('nav'), ks=[...e.querySelectorAll('.zmPick .zmPk')], R=x=>x.getBoundingClientRect();
   const navTop=(nav&&getComputedStyle(nav).position!=='static'&&R(nav).height>0)?R(nav).top:document.documentElement.clientHeight;
   let bottom=0; ks.forEach(k=>{ bottom=Math.max(bottom,R(k).bottom); const s=k.querySelector('small'); if(s) bottom=Math.max(bottom,R(s).bottom); const u=k.querySelector('.pkUse'); if(u) bottom=Math.max(bottom,R(u).bottom); });
   const hit=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
   const vw=document.documentElement.clientWidth, use=ks.map(k=>{ const u=k.querySelector('.pkUse'); if(!u) return null; const r=R(u), parts=[...u.children].map(x=>R(x)), bad=[];
       k.querySelectorAll('.zmFeat .fti, .zmFeat .ftl, .zmFeatBox .ftt').forEach(x=>{ if(parts.some(q=>hit(q,R(x)))) bad.push('できること'); });
       /* 説明の帯に重ねてよいのは、帯の説明文を出していないとき（小さい画面で、帯の中に利用用途を出す形）だけ */
       const sm=k.querySelector('small'); if(sm&&parts.some(q=>hit(q,R(sm)))&&!/rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(sm).color)) bad.push('説明の帯の文字');
       return {t:[...u.children].map(x=>x.textContent).join('|'), in:r.left>=0&&r.right<=vw&&r.height>6, bad:[...new Set(bad)].join(','), fs:parseFloat(getComputedStyle(u.children[1]).fontSize)}; });
   return {n:ks.length, sh:e.scrollHeight, ch:e.clientHeight, bottom:Math.round(bottom), navTop:Math.round(navTop), use, names:ks.map(k=>(k.dataset.pick||k.dataset.go||'yaku'))}; });
 if(c[3]) ck(m.n===5&&m.sh<=m.ch+1&&m.bottom<=m.navTop+1,c[0]+'：看板5枚と説明・利用用途が、スクロールなしでナビより上に入る（中身の下端 '+m.bottom+'／ナビの上 '+m.navTop+'・高さ '+m.sh+'/'+m.ch+'）');
 const u4=m.use.slice(0,4), u5=m.use[4];
 ck(u4.every(u=>u&&u.t==='利用用途|現場調査|見積依頼')&&u5===null,c[0]+'：できること のある4枚に「利用用途｜現場調査｜見積依頼」・役物作成には無い（'+m.use.map(u=>u?u.t:'なし').join(' ／ ')+'）');
 ck(u4.every(u=>u&&u.in&&!u.bad&&u.fs>=6.5),c[0]+'：利用用途の札は画面の中・できること や説明の帯と重ならない・字は6.5px以上（'+u4.map(u=>u?(u.in?'中':'外')+(u.bad?'×'+u.bad:'')+' '+u.fs+'px':'-').join(' ／ ')+'）');
 if(errs.length){ NG++; console.log('errors',errs.slice(0,3)); } await ctx.close(); }
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
