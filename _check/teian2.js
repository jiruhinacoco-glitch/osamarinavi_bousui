/* §1440 提案書（A4よこ）：1枚目＝番号つきの全体図と一覧／2枚目から＝屋根ごとの図・数量・仕様・写真。見本の図面（屋根6つ）で確かめる。
   手計算：①校舎棟 42×12＝504㎡ − 中抜き 3×3＝9㎡ ＝ 495.0㎡／立上り 外周108m＋中抜き12m＝120m × 0.3 ＝ 36.0㎡。合計 平場 1275.0㎡。
   直す前の版は★NG。使い方: node _check/teian2.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const ctx=await b.newContext({viewport:{width:1500,height:900}}); const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ localStorage.removeItem('nn_specs_v1'); const x=document.getElementById('tl_sample'); if(x)x.click(); }); await p.waitForTimeout(900);
const has=await p.evaluate(()=>typeof window.nnTeianPDF==='function'&&!!document.getElementById('nnTeianBtn'));
ck(has,'提案書の入口（積算・設定の 御見積書 の下のボタン）がある');
if(has){
 await p.evaluate(()=>{ const c=polyCenter(state.polys[0].pts), o={}; const cv2=document.createElement('canvas'); cv2.width=160; cv2.height=120; cv2.getContext('2d').fillRect(0,0,160,120); const d=cv2.toDataURL('image/jpeg',0.7);
   [0,1,2].forEach(i=>{ o['tst'+i]={d}; state.photos.push({id:'tst'+i,x:c.x-6+i*0.4,y:c.y+2,memo:'m'+i,t:1}); }); state.photos.push({id:'tstX',x:-50,y:-50,memo:'外',t:1}); o.tstX={d}; window.nnSitePhotoData=id=>(o[id]||{}).d||''; });
 const [pop]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(()=>nnTeianPDF())]);
 await pop.waitForLoadState('load'); await pop.waitForTimeout(900);
 const r=await pop.evaluate(()=>{ const ps=[...document.querySelectorAll('.paper')], a=ps[0], b2=ps[1], R=x=>x.getBoundingClientRect();
   return {n:ps.length, land:R(a).width>R(a).height, circ1:a.querySelectorAll('svg circle').length, rows:[...a.querySelectorAll('table tr')].map(t=>t.textContent.replace(/\s+/g,' ')),
     t2:b2.textContent.replace(/\s+/g,' '), dims:[...b2.querySelectorAll('svg text')].map(t=>t.textContent), imgs:[...b2.querySelectorAll('.pc img')].filter(i=>i.naturalWidth>0).length, cells:b2.querySelectorAll('.pc').length,
     steps:[...b2.querySelectorAll('.sp table tr')].length-1, kou:!!b2.querySelector('.kou img'), over:ps.some(x=>x.scrollHeight>x.clientHeight+2)}; });
 ck(r.n===7&&r.land,'屋根6つ → 7枚（全体1枚＋屋根ごと6枚）・A4よこ');
 ck(r.circ1===6&&/①\s*校舎棟.*平場 495\.0㎡\s*立上り 36\.0㎡\s*AS-T1/.test(r.rows[1])&&/平場 1275\.0㎡/.test(r.rows[7]),'1枚目：全体図に番号6つ・①は 平場495.0㎡ 立上り36.0㎡ AS-T1・合計 平場1275.0㎡（'+r.rows[1]+'）');
 ck(/① 校舎棟/.test(r.t2)&&/平場 495\.0㎡/.test(r.t2)&&/H300 mm/.test(r.t2)&&/改修仕様 AS-T1/.test(r.t2)&&r.dims.filter(d=>d==='42.0').length===2&&r.dims.filter(d=>d==='12.0').length===2,'2枚目：①の図に辺の長さ（42.0が2つ・12.0が2つ）・数量・立上り高さ・改修仕様（'+r.dims.join(',')+'）');
 ck(r.steps===4&&r.kou,'2枚目：工法の絵と、工程・材料の表（4工程）');
 ck(r.imgs===3&&r.cells===8,'2枚目：その屋根の中で撮った写真3枚だけが入る（枠は8つ・屋根の外の1枚は入らない）（'+r.imgs+'/'+r.cells+'）');
 ck(!r.over,'どの紙も、中身が紙からはみ出していない');
 /* §1442 図の文字：辺の長さどうし・番号の丸が重ならない／番号の丸は屋根の中／一覧の屋根の名前は折れない。L字（左上が斜めに欠けた形）・細長い屋根で確かめる */
 await p.evaluate(()=>{ state.polys=[]; state.photos=[]; state.scaleM=0.5; const mk=(n,P)=>{ const pts=P.map(q=>({x:q[0],y:q[1]})); state.polys.push({name:n,lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}); };
   mk('屋根①',[[0,60],[9,60],[9,62],[11,62],[11,66.2],[15.2,66.2],[15.2,72.8],[41.2,72.8],[41.2,86.8],[3.4,86.8],[3.4,66.2],[0.4,62]]); mk('屋根②',[[0,40],[100,40],[100,41.6],[0,41.6]]); recalc(); });
 const [pop2]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(()=>nnTeianPDF())]);
 await pop2.waitForLoadState('load'); await pop2.waitForTimeout(700);
 const g=await pop2.evaluate(()=>{ const out=[]; [...document.querySelectorAll('.paper')].forEach((pp,pi)=>{ pp.querySelectorAll('svg').forEach(sv=>{ const T=[...sv.querySelectorAll('text')].map(t=>t.getBoundingClientRect()), C=[...sv.querySelectorAll('circle')], PG=[...sv.querySelectorAll('polygon')];
       let ov=0; for(let i=0;i<T.length;i++) for(let j=i+1;j<T.length;j++){ if(Math.min(T[i].right,T[j].right)-Math.max(T[i].left,T[j].left)>1&&Math.min(T[i].bottom,T[j].bottom)-Math.max(T[i].top,T[j].top)>1) ov++; }
       /* 丸の中心が、どれかの屋根の形の中にある（SVG の isPointInFill で確かめる） */
       let outC=0; C.forEach(c=>{ const pt=sv.createSVGPoint(); pt.x=+c.getAttribute('cx'); pt.y=+c.getAttribute('cy'); if(!PG.some(pg=>pg.isPointInFill(pt))) outC++; });
       out.push({pi,ov,outC,n:T.length}); }); });
   const nm=[...document.querySelectorAll('.paper')[0].querySelectorAll('td.nm')].map(td=>{ const r=document.createRange(); r.selectNodeContents(td); return r.getClientRects().length; }); return {out,nm}; });   /* 文字が何行に分かれているか */
 ck(g.out.every(o=>o.ov===0),'図の文字（辺の長さ・番号）どうしが重ならない（重なり '+g.out.map(o=>o.ov).join(',')+'）');
 ck(g.out.every(o=>o.outC===0),'番号の丸は屋根の形の中にある（L字・幅0.8mの細長い屋根でも）（外に出た数 '+g.out.map(o=>o.outC).join(',')+'）');
 ck(g.nm.length===2&&g.nm.every(n=>n===1),'一覧の屋根の名前は1行（折れない）（行数 '+g.nm.join(',')+'）');
}
console.log('errors',errs.slice(0,3)); if(errs.length) NG++;
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
