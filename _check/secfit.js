/* 図面・積算 断面図（secCv）：引出線の材料名・「立上り H=…」・見出しの下の説明行が、絵（canvas）の左右の端で切れない（§1294）
   iPhone SE 縦横・iPhone 13・iPhone 13 Pro Max・PC。fillText を横取りして、描いた文字の左右の端を測る。
   ＋低い画面で「天端 W=…」の札が説明行に重ならない。直す前の版ではスマホで★NG。使い方: node _check/secfit.js [ファイル] */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html'; let NG=0; const ok=(c,m)=>{console.log((c?'○ ':'★NG ')+m); if(!c)NG++;};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const dev of ['iPhone SE (3rd gen)','iPhone SE (3rd gen) landscape','iPhone 13','iPhone 13 Pro Max','pc']){
 const c=await b.newContext(dev==='pc'?{viewport:{width:1366,height:768}}:{...devices[dev],deviceScaleFactor:1});
 await c.addInitScript(()=>{ const f0=CanvasRenderingContext2D.prototype.fillText, r0=CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillText=function(t,x,y){ if(this.canvas&&this.canvas.id==='secCv'){ const w=this.measureText(t).width, a=this.textAlign;
    const L=a==='center'?x-w/2:(a==='right'||a==='end')?x-w:x; (window.__sec=window.__sec||[]).push({t:String(t),L,R:L+w,y,f:this.font}); } return f0.apply(this,arguments); };
  CanvasRenderingContext2D.prototype.clearRect=(function(c0){ return function(){ if(this.canvas&&this.canvas.id==='secCv') window.__sec=[]; return c0.apply(this,arguments); }; })(CanvasRenderingContext2D.prototype.clearRect); });
 const p=await c.newPage();
 await p.goto('http://localhost:8899/'+F);await p.waitForTimeout(1200);
 await p.click('.zmPk[data-pick="zu"]');await p.waitForTimeout(600);await p.evaluate(()=>{ if(document.body.classList.contains('nn-zmenu')){ const g=document.querySelector('.zmGoB[data-go="zu"]'); if(g) g.click(); } });   /* ★2026-11-27 §1452 看板「平面図作成」はすぐ図面へ進む（設定の画面は通らない）。まだ入口に居るときだけ押す */await p.waitForTimeout(800);await p.evaluate('loadSample()');
 await p.evaluate("setTab('sec')");await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>{const W=document.getElementById('secCv').clientWidth;const T=window.__sec||[];
  const cut=T.filter(o=>o.L<-1||o.R>W+1).map(o=>o.t.slice(0,14)+' '+Math.round(o.L)+'〜'+Math.round(o.R)+'/'+W);
  const hi=T.findIndex(o=>/^断面詳細図（/.test(o.t)), sub=hi>=0?T[hi+1]:null, w=T.find(o=>/^天端 W=/.test(o.t));   /* 説明行＝見出しのすぐ次に描く文字 */
  window.__dbg=JSON.stringify(T.filter(o=>/天端 W|1mm|寸法の単位/.test(o.t)).map(o=>[o.t.slice(0,20),Math.round(o.y),o.f]));return {dbg:window.__dbg,n:T.length,cut,gap:(sub&&w)?Math.round((w.y-9)-(sub.y+3)):null};});
 if(process.env.DBG)console.log(r.dbg);ok(r.n>5&&!r.cut.length,dev+' 断面図の文字が左右で切れない'+(r.cut.length?' '+r.cut.join(' / '):'')+' （文字'+r.n+'）');
 if(r.gap!=null) ok(r.gap>=0,dev+' 「天端 W」の札が説明行に重ならない（すき間 '+r.gap+'px）');
 await c.close();}
await b.close();console.log(NG?'★NG '+NG+'件':'全項目○');})();
