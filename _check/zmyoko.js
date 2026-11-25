/* §1430 スマホよこ向きで、平面図作成の設定画面が画面に収まる。
   本人の実機（iPhone よこ）で下の行が画面の外へ出ていた。原因の1つ＝たて→よこに回したあと、下端の目印（fixed の要素）が たて向きの値のまま返ると、
   ページの高さ（--nnvh）が画面より大きくなり、収める計算が「はみ出していない」と判定して絵を最大にしていた。
   ①ふつうのよこ向き ②ホーム画面起動＋回したあと目印が古いまま（まね） ③たて向きは今までどおり。直す前の版は②が★NG。
   使い方: node _check/zmyoko.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const open=async(vp,fake)=>{ const ctx=await b.newContext({viewport:vp,isMobile:true,hasTouch:true,userAgent:UA});
  if(fake) await ctx.addInitScript(()=>{ try{ Object.defineProperty(navigator,'standalone',{get:()=>true}); Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); }catch(_){}
    const g=Element.prototype.getBoundingClientRect; Element.prototype.getBoundingClientRect=function(){ const r=g.call(this);
      try{ if(window.__rot&&this.id==='nnBtmProbe') return {left:r.left,right:r.right,top:851,bottom:852,width:1,height:1,x:r.x,y:851}; }catch(_){} return r; }; });
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.evaluate(()=>{ state.kubun='kaishu'; state.kizon='roshutsu'; state.dannetsu=1; nnZMenuOpen(); nnZMenuPick('zu'); }); await p.waitForTimeout(900); return p; };
const meas=p=>p.evaluate(()=>{ const e=document.getElementById('nnZMenu'), c=[...e.querySelectorAll('.zmCard')].find(c=>c.offsetParent), rows=[...c.querySelectorAll('.zmRow')].filter(x=>x.offsetParent);
  return {vh:document.documentElement.clientHeight, body:document.body.offsetHeight, rows:rows.length, last:Math.round(Math.max(...rows.map(x=>x.getBoundingClientRect().bottom))), go:Math.round(c.querySelector('.zmGoB').getBoundingClientRect().bottom), ic:e.style.getPropertyValue('--zmIc')}; });
/* ① ふつうのよこ向き（ナビが隠れたあとまで待つ） */
let p=await open({width:852,height:393},false); await p.waitForTimeout(6500); let m=await meas(p);
ck(m.rows>=6&&m.last<=m.vh&&m.go<=m.vh&&m.body<=m.vh+1,'よこ向き 852×393：全部の行と「はじめる」が画面の中（'+JSON.stringify(m)+'）');
/* ② ホーム画面起動・たてで開いてからよこへ回す・目印は たて向きの値（852）のまま */
p=await open({width:393,height:852},true); await p.evaluate(()=>{ window.__rot=1; }); await p.setViewportSize({width:852,height:393}); await p.waitForTimeout(7000); m=await meas(p);
ck(m.body<=m.vh+1,'回したあと目印が古いままでも、ページの高さは画面（393）を超えない（'+m.body+'）');
ck(m.rows>=6&&m.last<=m.vh&&m.go<=m.vh,'そのとき全部の行と「はじめる」が画面の中（'+JSON.stringify(m)+'）');
/* ③ たて向き・ホーム画面起動：高さは今までどおり画面いっぱい（上限で縮めていない） */
p=await open({width:393,height:852},true); await p.waitForTimeout(1500); m=await meas(p);
ck(m.body>=851&&m.body<=853,'たて向き：ページの高さは 852 のまま（'+m.body+'）');
/* §1438 ナビが隠れたあと（5秒さわらないと隠れる）：カードの下の枠・「はじめる」・3D見本が、画面の下端より 8px 以上 上にある（たて・よこ・小さい画面） */
for(const vp of [[393,852,'たて 393×852'],[375,667,'たて 375×667'],[852,393,'よこ 852×393'],[667,375,'よこ 667×375']]){
  p=await open({width:vp[0],height:vp[1]},false);
  await p.waitForFunction(()=>{ const n=document.getElementById('nav'); return n&&n.style.transform==='translateY(120%)'; },null,{timeout:12000}).catch(()=>{});
  /* 収め直しが終わるまで条件で待つ（ナビが引っこむ動きのあと、入れ物の高さが落ち着いてから測り直す作り） */
  await p.waitForFunction(()=>{ const e=document.getElementById('nnZMenu'); return e.scrollHeight<=e.clientHeight+1; },null,{timeout:4000}).catch(()=>{}); await p.waitForTimeout(700);
  const q=await p.evaluate(()=>{ const e=document.getElementById('nnZMenu'), c=[...e.querySelectorAll('.zmCard')].find(c=>c.offsetParent), R=x=>Math.round(x.getBoundingClientRect().bottom), pv=c.querySelector('.zmPrev');
    return {vh:document.documentElement.clientHeight, card:R(c), go:R(c.querySelector('.zmGoB')), pv:pv?R(pv):0, pvH:pv?Math.round(pv.getBoundingClientRect().height):0, rows:Math.max(...[...c.querySelectorAll('.zmRow')].filter(x=>x.offsetParent).map(R)), sh:e.scrollHeight, ch:e.clientHeight}; });
  ck(q.card<=q.vh-8&&q.go<=q.vh-8&&q.pv<=q.vh-8&&q.rows<=q.vh-8&&q.sh<=q.ch+1&&q.pvH>=100,vp[2]+'・ナビが隠れたあと：カードの枠・はじめる・3D見本が画面の下端より8px以上 上（'+JSON.stringify(q)+'）'); }
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
