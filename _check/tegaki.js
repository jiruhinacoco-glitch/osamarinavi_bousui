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
 /* ⑤ いろいろなかき方を読めるか（読み取りだけ）。辺の向き（度・右＝0・下＝90）を、手で決めた答えと突き合わせる。一周の並びなので数え始めは問わない */
 const cases=[
  ['閉じきっていない長方形（右回り）', wobble([[50,60],[310,60],[310,240],[50,240],[50,95]],6,3), [0,90,180,270], 0],
  ['左回りの長方形', wobble([[50,60],[50,240],[310,240],[310,60],[62,60]],5,5), [90,0,270,180], 0],
  ['始点が辺の途中の長方形', wobble([[180,60],[310,60],[310,240],[50,240],[50,60],[170,60]],5,9), [0,90,180,270], 0],
  ['コの字（上が凹む）', wobble([[50,60],[130,60],[130,150],[230,150],[230,60],[310,60],[310,300],[50,300],[50,70]],4,13), [0,90,0,270,0,90,180,270], 0],
  ['小さく丸まった角の長方形', (()=>{ const o=[]; const add=(a,c,n)=>{ for(let k=0;k<n;k++) o.push([a[0]+(c[0]-a[0])*k/n,a[1]+(c[1]-a[1])*k/n]); };
      /* 角の丸め＝ななめ17px（長い方 260px の 6.5%） */ add([62,60],[298,60],30); add([298,60],[310,72],3); add([310,72],[310,228],20); add([310,228],[298,240],3); add([298,240],[62,240],30); add([62,240],[50,228],3); add([50,228],[50,72],20); add([50,72],[62,60],3); return o; })(), [0,90,180,270], 0],
  /* 大きく丸くかいた線は、1本の斜めの線にまとめず、数本の辺として残る（角が6つ以上になる） */
  /* §1436 ななめの辺は、かいた角度のまま残る（前は直角に直されて別の形になった） */
  ['ななめ1本の五角形：45度の辺が残る', wobble([[60,80],[220,80],[340,200],[340,330],[60,330],[60,90]],4,21), [0,45,90,180,270], 0],
  ['三角形：かいた角度のまま（底辺0度・右の辺 約237度・左の辺 約122度）', wobble([[60,300],[340,300],[200,80],[66,290]],4,31), [0,237.5,121.4], 4],
  ['平行四辺形：かたむいた辺が残る（約106.7度・約286.7度）', wobble([[100,100],[340,100],[280,300],[40,300],[97,110]],4,41), [0,106.7,180,286.7], 4],
  ['始点を通りこしてかいた長方形（行きすぎた分は切る）', wobble([[50,60],[310,60],[310,240],[50,240],[50,40]],3,7).concat([[52,38]]), [0,90,180,270], 0] ];
 for(const c of cases){ const got=await p.evaluate(pts=>{ const r=nnTegakiRead(pts.map(q=>({x:q[0],y:q[1]}))); return r?r.degs:null; },c[1]);
   let ok=false; if(got&&got.length===c[2].length){ const n=got.length, df=(a,b)=>{ const d=Math.abs(a-b)%360; return d>180?360-d:d; }; for(let s=0;s<n&&!ok;s++) ok=c[2].every((w,i)=>df(got[(i+s)%n],w)<=c[3]+0.01); }
   ck(ok,c[0]+' → '+(got?got.join(','):'読めない')+'（正しくは '+c[2].join(',')+(c[3]?'・±'+c[3]+'度':'')+'・数え始めは問わない）'); }
 { const o=[]; for(let k=0;k<=24;k++){ const th=Math.PI+Math.PI/2*k/24; o.push([200+140*Math.cos(th),200+140*Math.sin(th)]); }   /* 左上が半径140の丸い角（4分の1の円） */
   const rest=[[340,60],[340,330],[60,330],[60,205]]; let pv=o[o.length-1]; rest.forEach(c=>{ for(let k=1;k<=20;k++) o.push([pv[0]+(c[0]-pv[0])*k/20,pv[1]+(c[1]-pv[1])*k/20]); pv=c; });
   const g=await p.evaluate(pts=>{ const r=nnTegakiRead(pts.map(q=>({x:q[0],y:q[1]}))); return r?r.degs:null; },o);
   ck(g&&g.length>=6&&g.some(d=>d>275&&d<355),'大きく丸くかいた角は、数本の辺として残る（'+(g?g.join(','):'読めない')+'）'); }
 /* かいた長さの比が残る：よこ260・たて180 の長方形 → 仮の長さの比 1.44（±0.08） */
 const lr=await p.evaluate(pts=>{ const r=nnTegakiRead(pts.map(q=>({x:q[0],y:q[1]}))); return r?r.lens:null; },wobble([[50,60],[310,60],[310,240],[50,240],[50,70]],3,2));
 ck(lr&&lr.length===4&&Math.abs(Math.max(lr[0],lr[1])/Math.min(lr[0],lr[1])-260/180)<0.08,'かいた長さの比が残る（'+JSON.stringify(lr)+'・よこ÷たて＝1.44）');
 /* 閉じていない・交わる線は読まない（本人の線の形：終わりが始点に戻らず、閉じると線が交わる） */
 const key=[[340,405],[335,372],[352,340],[385,308],[425,292],[470,292],[520,305],[565,330],[595,365],[605,405],[600,440],[690,460],[790,472],[795,376],[850,395],[905,412],[922,440],[924,540],[960,558],[1030,575],[1022,366],[1070,338],[1140,323],[1215,321],[1250,540],[1290,755],[1230,765],[1200,605],[1145,705],[1090,800],[975,810],[755,780],[777,600],[610,600],[520,597],[400,587],[390,572],[330,660],[270,746],[470,796],[520,598]];
 const why=await p.evaluate(pts=>[nnTegakiRead(pts.map(q=>({x:q[0],y:q[1]})))===null, nnTegakiWhy(pts.map(q=>({x:q[0],y:q[1]})))],wobble(key,1,5));
 ck(why[0]&&why[1]==='cross','終わりが始点に戻らず、閉じると線が交わる線は「読めない」（理由 '+why[1]+'）＝別の形をでっちあげない');
 ck(await p.evaluate(()=>nnTegakiRead([{x:10,y:10},{x:200,y:12},{x:380,y:14}])===null&&nnTegakiRead([{x:10,y:10},{x:12,y:11},{x:14,y:12},{x:15,y:13},{x:16,y:12},{x:14,y:10}])===null),'ただの横線・小さな点は「読み取れない」になる');
 /* ⑥ ななめの辺がある形を、かいて → 数字を入れて → 置く（出来上がり）。
    かく：右160 → 右下45度 → 下130 → 左（自動）→ 上（自動）。入れる：A=8・B=6（45度）・C=5
    手計算：45度の6m ＝ よこ4.2426・たて4.2426。左の辺＝8＋4.2426＝12.2426、上の辺＝4.2426＋5＝9.2426。
            面積＝12.2426×9.2426 − 4.2426²÷2 ＝ 113.154 − 9.000 ＝ 104.154㎡。外周＝8＋6＋5＋12.2426＋9.2426＝40.485m */
 await p.evaluate(()=>{ state.polys=[]; nnTegakiOpen(); }); await p.waitForTimeout(400);
 await drawOn(p,wobble([[40,80],[200,80],[320,200],[320,330],[40,330],[40,92]],3,17));
 const lab6=await p.evaluate(()=>[...document.querySelectorAll('#nnDimSvg g.dlab text')].map(t=>t.textContent).join('|'));
 ck(/A ？\|B ？\|C ？\|D 自動\|E 自動/.test(lab6),'ななめの辺がある五角形：5辺（A〜C＝入れる・D/E＝自動）（'+lab6+'）');
 for(const k of ['8','next','6','next','5','next']) await tap(k);
 const sum6=await p.evaluate(()=>[document.getElementById('nnDimArea').textContent, document.getElementById('nnDimPeri').textContent]);
 await p.evaluate(()=>nnDimInPlace()); await p.waitForTimeout(700);
 const r6=await p.evaluate(()=>{ const s=state.scaleM||0.5, P=(state.polys[0]||{}).pts||[]; let a=0,l=0, sl=0; for(let i=0;i<P.length;i++){ const q=P[(i+1)%P.length]; a+=P[i].x*q.y-q.x*P[i].y; const L=Math.hypot(q.x-P[i].x,q.y-P[i].y); l+=L; if(Math.abs(q.x-P[i].x)>1e-6&&Math.abs(q.y-P[i].y)>1e-6) sl=L*s; }
   return {n:state.polys.length, v:P.length, area:Math.abs(a/2)*s*s, len:l*s, naname:sl}; });
 ck(sum6[0]==='104.15㎡'&&r6.n===1&&r6.v===5&&Math.abs(r6.area-104.154)<0.02&&Math.abs(r6.len-40.485)<0.02&&Math.abs(r6.naname-6)<0.01,'数字を3つ入れて置くと、ななめ6mの辺がある屋根（104.15㎡・外周40.49m・角5つ）になる（'+sum6.join(' ')+' '+JSON.stringify(r6)+'）');
 /* ⑦ 読めない線をかいたとき：かいた線は消さない・かく画面のまま */
 await p.evaluate(()=>{ state.polys=[]; nnTegakiOpen(); }); await p.waitForTimeout(400);
 await drawOn(p,[[60,100],[300,100],[300,300],[150,300],[150,60],[152,40]].flatMap((a,i,A)=>{ if(i+1>=A.length) return [a]; const c=A[i+1], o=[]; for(let k=0;k<12;k++) o.push([a[0]+(c[0]-a[0])*k/12,a[1]+(c[1]-a[1])*k/12]); return o; }));
 const s7=await p.evaluate(()=>{ const d=document.getElementById('nnDimIn'), c=document.getElementById('nnTegCv'), g=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=0;i<g.length;i+=4){ if(g[i+3]>0&&g[i+1]>80&&g[i]<90) n++; } return {sk:d.classList.contains('sketch'), ink:n}; });
 ck(s7.sk&&s7.ink>200,'線が交わっていて読めないとき：かく画面のまま・かいた線は残る（'+JSON.stringify(s7)+'）');
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
