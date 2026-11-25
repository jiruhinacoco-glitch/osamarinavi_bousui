/* §1429 手がき（一筆で形をかく → 辺を押して寸法）と、はじめ方をえらぶ窓。スマホたてで端から端まで通す。
   ①平面図作成の「はじめる」で えらぶ窓が出る ②手書き → かく画面 ③ぶれたL字の線を一筆でかく → 6辺の形に整う
   ④4つの辺に数字 → 図面に置く → 手で計算した面積・外周と合う ⑤閉じきっていない長方形・左回り・始点が辺の途中 も読める ⑥頂点打ちを選ぶと今までどおり
   直す前の版は★NG。使い方: node _check/tegaki.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const mk=async()=>{ const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});
  const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); p._e=[]; p.on('pageerror',e=>p._e.push(e.message.slice(0,140))); return p; };
/* 角の並びを、ぶれ（±amp px・決まった乱数）つきの細かい点の列にする */
function wobble(C,amp,seed){ let s=seed||7; const rnd=()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff-0.5; }; const out=[];
  for(let i=0;i+1<C.length;i++){ const a=C[i], c=C[i+1], n=Math.max(2,Math.round(Math.hypot(c[0]-a[0],c[1]-a[1])/7));
    for(let k=0;k<n;k++){ const t=k/n; out.push([a[0]+(c[0]-a[0])*t+rnd()*2*amp, a[1]+(c[1]-a[1])*t+rnd()*2*amp]); } }
  out.push(C[C.length-1]); return out; }
const drawOn=async(p,pts)=>{ const r=await p.evaluate(()=>{ const c=document.getElementById('nnTegCv').getBoundingClientRect(); return [c.left,c.top,c.width,c.height]; });
  await p.mouse.move(r[0]+pts[0][0], r[1]+pts[0][1]); await p.mouse.down();
  for(const q of pts.slice(1)) await p.mouse.move(r[0]+q[0], r[1]+q[1]);
  await p.mouse.up(); await p.waitForTimeout(250); return r; };
let p=await mk(); await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500);
await p.evaluate(()=>{ state.polys=[]; state.parts=[]; state.scaleM=0.5; try{ saveState(); }catch(_){} });
/* ① 平面図作成 → はじめる */
await p.evaluate(()=>{ nnZMenuOpen(); nnZMenuPick('zu'); }); await p.waitForTimeout(500);
await p.evaluate(()=>{ const g=document.querySelector('#nnZMenu .zmCard[data-card="zu"] [data-go="zu"]')||document.querySelector('#nnZMenu [data-go="zu"]'); g.click(); }); await p.waitForTimeout(500);
const h1=await p.evaluate(()=>{ const h=document.getElementById('nnHajime'); return !!h&&h.classList.contains('on')&&h.querySelectorAll('[data-h]').length; });
ck(h1===2,'平面図作成の「はじめる」で、手書き／頂点打ち をえらぶ窓が出る');
/* ② 手書き */
await p.evaluate(()=>{ const x=document.querySelector('#nnHajime [data-h="tegaki"]'); if(x) x.click(); }); await p.waitForTimeout(500);
const st2=await p.evaluate(()=>{ const d=document.getElementById('nnDimIn'), c=document.getElementById('nnTegCv'); if(!d||!c) return null; const r=c.getBoundingClientRect(), k=document.querySelector('#nnDimIn .dkeys').getBoundingClientRect();
  return {on:d.classList.contains('on'), sk:d.classList.contains('sketch'), w:Math.round(r.width), h:Math.round(r.height), keys:k.height}; });
ck(st2&&st2.on&&st2.sk&&st2.h>=420&&st2.keys===0,'手書きを選ぶと、かく画面が広く出る（数字のボタンはしまう）（'+JSON.stringify(st2)+'）');
if(st2&&st2.sk){
 /* ③ L字（右→下→左→下→左→上）を ±5px のぶれつきで。終わりは始点の12px手前で止める（閉じきらない） */
 const Lc=[[60,70],[300,70],[300,190],[180,190],[180,330],[60,330],[60,82]];
 await drawOn(p,wobble(Lc,5,11));
 const s3=await p.evaluate(()=>{ const d=document.getElementById('nnDimIn'); return {sk:d.classList.contains('sketch'), n:new Set([...document.querySelectorAll('#nnDimSvg g.dlab')].map(g=>g.dataset.e)).size, lab:[...document.querySelectorAll('#nnDimSvg g.dlab text')].map(t=>t.textContent).join('|')}; });
 ck(!s3.sk&&s3.n===6&&/A ？\|B ？\|C ？\|D ？\|E 自動\|F 自動/.test(s3.lab),'ぶれたL字の一筆が 6辺の形に整う（A〜D＝入れる辺・E/F＝自動）（'+JSON.stringify(s3)+'）');
 /* ④ A=10 B=4 C=5 D=5 → E=5（左）・F=9（上）。面積＝10×4＋5×5＝65㎡、外周＝10＋4＋5＋5＋5＋9＝38m */
 const tap=async k=>{ await p.evaluate(k=>{ const x=document.querySelector('#nnDimIn [data-k="'+k+'"]'); if(x) x.click(); },k); await p.waitForTimeout(40); };
 for(const k of ['1','0','next','4','next','5','next','5','next']) await tap(k);
 const sum=await p.evaluate(()=>[document.getElementById('nnDimArea').textContent, document.getElementById('nnDimPeri').textContent]);
 await p.evaluate(()=>nnDimInPlace()); await p.waitForTimeout(700);
 const r4=await p.evaluate(()=>{ const s=state.scaleM||0.5, P=(state.polys[0]||{}).pts||[]; let a=0,l=0; for(let i=0;i<P.length;i++){ const q=P[(i+1)%P.length]; a+=P[i].x*q.y-q.x*P[i].y; l+=Math.hypot(q.x-P[i].x,q.y-P[i].y); }
   return {n:state.polys.length, v:P.length, area:Math.abs(a/2)*s*s, len:l*s}; });
 ck(sum[0]==='65.00㎡'&&sum[1]==='38.00m'&&r4.n===1&&r4.v===6&&Math.abs(r4.area-65)<0.01&&Math.abs(r4.len-38)<0.01,'数字を4つ入れて置くと、L字の屋根（65㎡・外周38m・角6つ）になる（'+sum.join(' ')+' '+JSON.stringify(r4)+'）');
 /* ⑤ いろいろなかき方を読めるか（読み取りだけ）。向きの並びを手で決めた答えと突き合わせる */
 const cases=[
  ['閉じきっていない長方形（右回り）', wobble([[50,60],[310,60],[310,240],[50,240],[50,95]],6,3), 'R D L U'],
  ['左回りの長方形', wobble([[50,60],[50,240],[310,240],[310,60],[62,60]],5,5), 'D R U L'],
  ['始点が辺の途中の長方形', wobble([[180,60],[310,60],[310,240],[50,240],[50,60],[170,60]],5,9), 'R D L U'],
  ['コの字（上が凹む）', wobble([[50,60],[130,60],[130,150],[230,150],[230,60],[310,60],[310,300],[50,300],[50,70]],4,13), 'R D R U R D L U'],
  ['小さく丸まった角の長方形', (()=>{ const o=[]; const add=(a,c,n)=>{ for(let k=0;k<n;k++) o.push([a[0]+(c[0]-a[0])*k/n,a[1]+(c[1]-a[1])*k/n]); };
      add([70,60],[290,60],30); add([290,60],[310,80],4); add([310,80],[310,220],20); add([310,220],[290,240],4); add([290,240],[70,240],30); add([70,240],[50,220],4); add([50,220],[50,80],20); add([50,80],[70,60],4); return o; })(), 'R D L U'] ];
 const NM={'1,0':'R','-1,0':'L','0,1':'D','0,-1':'U'};
 for(const c of cases){ const got=await p.evaluate(pts=>{ const r=nnTegakiRead(pts.map(q=>({x:q[0],y:q[1]}))); return r?r.dirs.map(d=>d.join(',')):null; },c[1]);
   const s=got?got.map(x=>NM[x]).join(' '):'読めない';
   /* 一周の並びなので、どの辺から数え始めても同じ形（始点が辺の途中だと、数え始めがずれる） */
   const same=(x,y)=>x.length===y.length&&(y+' '+y).indexOf(x)>=0;
   ck(same(s,c[2]),c[0]+' → '+s+'（正しくは '+c[2]+'・数え始めは問わない）'); }
 ck(await p.evaluate(()=>nnTegakiRead([{x:10,y:10},{x:200,y:12},{x:380,y:14}])===null&&nnTegakiRead([{x:10,y:10},{x:12,y:11},{x:14,y:12},{x:15,y:13},{x:16,y:12},{x:14,y:10}])===null),'ただの横線・小さな点は「読み取れない」になる（形をでっちあげない）');
}
console.log('errors',p._e.slice(0,3)); if(p._e.length) NG++;
/* ⑥ 頂点打ち */
p=await mk(); await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500);
await p.evaluate(()=>{ state.polys=[]; state.parts=[]; nnZMenuOpen(); nnZMenuPick('zu'); }); await p.waitForTimeout(400);
await p.evaluate(()=>{ (document.querySelector('#nnZMenu .zmCard[data-card="zu"] [data-go="zu"]')||document.querySelector('#nnZMenu [data-go="zu"]')).click(); }); await p.waitForTimeout(400);
await p.evaluate(()=>{ const x=document.querySelector('#nnHajime [data-h="ten"]'); if(x) x.click(); }); await p.waitForTimeout(300);
const s6=await p.evaluate(()=>({h:document.getElementById('nnHajime')?document.getElementById('nnHajime').classList.contains('on'):null, d:document.getElementById('nnDimIn').classList.contains('on'), tool:(typeof tool!=='undefined')?tool:'', menu:nnZMenuOn()}));
ck(s6.h===false&&!s6.d&&s6.tool==='draw'&&!s6.menu,'頂点打ちを選ぶと窓が閉じ、今までどおり描画の道具で始まる（'+JSON.stringify(s6)+'）');
/* 屋根がもうあるときは聞かない */
await p.evaluate(()=>{ const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]; state.polys.push({name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}); nnZMenuOpen(); nnZMenuPick('zu'); }); await p.waitForTimeout(400);
await p.evaluate(()=>{ (document.querySelector('#nnZMenu .zmCard[data-card="zu"] [data-go="zu"]')||document.querySelector('#nnZMenu [data-go="zu"]')).click(); }); await p.waitForTimeout(400);
ck(await p.evaluate(()=>!document.getElementById('nnHajime').classList.contains('on')),'屋根がもうあるとき（つづき）は、えらぶ窓を出さない');
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
