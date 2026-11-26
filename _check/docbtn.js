/* §1441 ①スマホ：提案書・見積書の入口が表にある（平面図・3D の右下）→ 押すと選べて、提案書が出る
   ②よこ向きの下のナビ：絵が箱の中に入っている（iPhone は箱の外へ出た絵が切れる）・帯は ::before・絵は押せる・下にあるボタンも押せる
   ③材料の窓：動かした位置を覚えていても、画面（方眼紙）の中に全部入る。 直す前の版は★NG。
   使い方: node _check/docbtn.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
for(const vp of [[852,393,'よこ'],[393,852,'たて']]){ const ctx=await b.newContext({viewport:{width:vp[0],height:vp[1]},isMobile:true,hasTouch:true,userAgent:UA});
 await ctx.addInitScript(()=>{ try{ localStorage.setItem('nn_matqty_pos',JSON.stringify({x:20,y:700})); }catch(_){} });
 const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
 await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500);
 await p.evaluate(()=>{ try{nnZMenuClose()}catch(_){} state.polys=[]; state.scaleM=1; const pts=[{x:2,y:2},{x:12,y:2},{x:12,y:8},{x:2,y:8}]; state.polys.push({name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}); state.active=0; recalc(); setTab('zu'); nnFitView(); }); await p.waitForTimeout(900);
 await p.evaluate(()=>{ const t=document.getElementById('navShowTab'); if(t&&t.style.display==='block') t.click(); }); await p.waitForTimeout(900);
 const m=await p.evaluate(()=>{ const R=x=>x.getBoundingClientRect(), nav=document.getElementById('nav'), nr=R(nav), ims=[...nav.querySelectorAll('img')].filter(i=>R(i).width>10), db=document.getElementById('nnDocBtn'), sb=document.getElementById('nnSideBtn'), mq=document.getElementById('nnMatQty'), cw=R(document.getElementById('canvaswrap'));
   const top=(e)=>{ const r=R(e), t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return !!t&&(t===e||e.contains(t)); };
   return {imgIn:ims.every(i=>R(i).top>=nr.top-0.5), n:ims.length, niTap:top(nav.querySelector('.ni')), db:db?[Math.round(R(db).left),Math.round(R(db).top),Math.round(R(db).right),Math.round(R(db).bottom)]:null, dbTap:db?top(db):false, sbTap:sb?top(sb):false,
     gap:db&&sb?Math.round(R(sb).left-R(db).right):-99, vw:document.documentElement.clientWidth, mq:mq&&mq.offsetParent?[Math.round(R(mq).left-cw.left),Math.round(R(mq).top-cw.top),Math.round(cw.right-R(mq).right),Math.round(cw.bottom-R(mq).bottom)]:null}; });
 if(vp[2]==='よこ') ck(m.n>=9&&m.imgIn&&m.niTap,'よこ：下のナビの絵9つが箱の中に入っている・絵は押せる');
 ck(m.db&&m.dbTap&&m.sbTap&&m.gap>=4&&m.db[0]>=0&&m.db[2]<=m.vw,vp[2]+'：「提案書・見積」のボタンが表にあり、積算・設定 と重ならず、どちらも押せる（'+JSON.stringify(m.db)+'・すき間 '+m.gap+'）');
 ck(m.mq&&m.mq.every(v=>v>=0),vp[2]+'：材料の窓は、覚えた位置（下の方）があっても方眼紙の中に全部入る（左・上・右・下のあき '+JSON.stringify(m.mq)+'）');
 await p.evaluate(()=>document.getElementById('nnDocBtn').click()); await p.waitForTimeout(200);
 const menu=await p.evaluate(()=>{ const e=document.getElementById('nnDocMenu'); return e.classList.contains('on')?[...e.querySelectorAll('button')].map(x=>x.textContent).join('|'):''; });
 ck(/提案書を出す\|.*御見積書を出す/.test(menu),vp[2]+'：押すと 提案書／御見積書 を選べる（'+menu+'）');
 const [pop]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(()=>document.querySelector('#nnDocMenu [data-d="teian"]').click())]);
 await pop.waitForLoadState('load'); ck((await pop.evaluate(()=>document.querySelectorAll('.paper').length))===2,vp[2]+'：提案書が出る（屋根1つ → 2枚）');
 if(errs.length){ NG++; console.log('errors',errs.slice(0,3)); } await ctx.close(); }
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
