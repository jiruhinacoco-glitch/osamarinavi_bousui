/* §1432 ②図形へ飛ぶ：平面図で図形を見失ったとき、ボタンか Home キーで図形の見える表示へ戻る。
   ①図形があると右はしに「⌖ 図形へ」 ②図形がぜんぶ画面の外 → まん中に大きく「図形が画面の外にあります」 ③押すと図形が画面の中に戻り、大きい表示は消える
   ④Home キーでも同じ ⑤何もかいていないときは出ない ⑥スマホよこでも同じ。直す前の版は★NG。
   使い方: node _check/goshape.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
for(const ph of [0,1]){ const nm=ph?'スマホよこ':'PC';
 const ctx=await b.newContext(ph?{viewport:{width:852,height:393},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'}:{viewport:{width:1500,height:900}});
 const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
 await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500);
 await p.evaluate(()=>{ try{nnZMenuClose()}catch(_){} state.polys=[]; state.parts=[]; state.underlay=null; state.scaleM=1; drawPts=[]; setTab('zu'); draw(); });
 const st=()=>p.evaluate(()=>{ const e=document.getElementById('nnGoShape'); if(!e) return null; const r=e.getBoundingClientRect(), c=cv.getBoundingClientRect();
   /* 屋根の角が画面（方眼）の中に何個入っているか：自分で px に直して数える */
   let inside=0, all=0; (state.polys||[]).forEach(q=>q.pts.forEach(t=>{ all++; const x=ox+t.x*cellPx, y=oy+t.y*cellPx; if(x>=0&&x<=cv.width/devicePixelRatio&&y>=0&&y<=cv.height/devicePixelRatio) inside++; }));
   return {vis:getComputedStyle(e).display!=='none', lost:e.classList.contains('lost'), txt:e.textContent, cx:Math.round((r.left+r.width/2-c.left)/c.width*100), inside, all}; });
 let s=await st(); ck(s&&!s.vis,nm+'：何もかいていないときは出ない（'+JSON.stringify(s)+'）');
 await p.evaluate(()=>{ const pts=[{x:2,y:2},{x:12,y:2},{x:12,y:8},{x:2,y:8}]; state.polys.push({name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}); state.active=0; recalc(); nnFitView(); }); await p.waitForTimeout(300);
 s=await st(); ck(s&&s.vis&&!s.lost&&s.inside===4&&s.cx>80,nm+'：図形が見えているときは、右はしに小さく「⌖ 図形へ」（'+JSON.stringify(s)+'）');
 /* 図形を画面の外へ（表示位置を大きくずらす＝指で流してしまった状態） */
 await p.evaluate(()=>{ ox+=9000; oy-=6000; draw(); }); await p.waitForTimeout(200);
 s=await st(); ck(s&&s.vis&&s.lost&&s.inside===0&&/画面の外/.test(s.txt)&&s.cx>35&&s.cx<65,nm+'：図形がぜんぶ画面の外 → まん中に大きく知らせる（'+JSON.stringify(s)+'）');
 await p.evaluate(()=>document.getElementById('nnGoShape').click()); await p.waitForTimeout(300);
 s=await st(); ck(s&&s.inside===4&&!s.lost,nm+'：押すと図形の角4つが画面の中に戻り、大きい知らせは消える（'+JSON.stringify(s)+'）');
 if(!ph){ await p.evaluate(()=>{ ox-=7000; draw(); }); await p.waitForTimeout(150); const s0=await st(); await p.keyboard.press('Home'); await p.waitForTimeout(300); s=await st();
   ck(s0.inside===0&&s.inside===4,nm+'：Home キーでも図形へ戻る（前 '+s0.inside+'→後 '+s.inside+'）'); }
 console.log(nm,'errors',errs.slice(0,3)); if(errs.length) NG++; await ctx.close(); }
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
