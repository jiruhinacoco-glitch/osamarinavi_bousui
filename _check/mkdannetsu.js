/* §1421 作り方「敷き並べる（断熱材などの板）」＝ how:'ita'。ASI-T1 の5工程（プライマー→断熱材→部分粘着→露出→仕上塗料）を
   12m×8m・立上り300 で、手で計算した値と突き合わせる。あわせて 3D で 板に厚みがあること・上の層が厚みぶん上がること・めくり を測る。
   直す前の版は★NG。使い方: node _check/mkdannetsu.js [zumen_sekisan.html]   （先に python3 -m http.server 8899） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
const ST=(no,w,mk)=>({no:String(no),w,matId:null,matName:'',srcP:'',u:null,coef:null,mk});
const SPECS={v:1,items:[{id:'t1',code:'ASI-T1',name:'見本',cat:'改質アスファルトシート防水',sub:'',src:'自社',ap:'自社',updatedAt:Date.now(),steps:[
  ST(1,'プライマー塗り',{bu:'hira',how:'nuru'}),
  ST(2,'断熱材張付け',{bu:'hira',how:'ita',sw:0.91,sl:1.82,t:50,zure:1}),
  ST(3,'部分粘着層付改質アスファルトシート',{bu:'hira',how:'tsuki',dir:'L',lapS:100,sw:1,sl:10}),
  ST(4,'改質アスファルトシート（露出）',{bu:'hira',how:'kasane',lapS:100,lapL:100,sw:1,sl:10}),
  ST(5,'仕上塗料塗り',{bu:'hira',how:'nuru'})]}]};
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext({viewport:{width:1500,height:900}});
await ctx.addInitScript(s=>{ localStorage.setItem('nn_specs_v1',s); },JSON.stringify(SPECS));
const p=await ctx.newPage(); p.on('dialog',d=>d.accept()); const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1600);
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});
await p.evaluate(()=>{ state.specCode='ASI-T1'; state.scaleM=1; state.polys=[]; state.parts=[]; state.d3sol=[]; delete state.d3mk; delete state.d3mkPeel;
  const pts=[{x:0,y:0},{x:12,y:0},{x:12,y:8},{x:0,y:8}];
  state.polys.push({name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}); state.active=0; recalc(); setTab('d3'); });
await p.waitForTimeout(2500);
let NG=0; const ck=(ok,m)=>{ if(!ok)NG++; console.log((ok?'○ ':'★NG ')+m); };
const L=await p.evaluate(()=>{ const M=window.nnMkSteps&&nnMkSteps(); return M?M.L.map(x=>x.how):[]; });
ck(L.length===5&&L[1]==='ita','ASI-T1 の5工程を読める・2工程目が「敷き並べる」（'+L.join(',')+'）');
if(L.length===5&&L[1]==='ita'){
 const q=await p.evaluate(()=>nnMkQty().Q.map(q=>({area:+q.area.toFixed(3), n:q.n, rolls:q.rolls})));
 /* 手計算（列は x に沿う・板 0.91×1.82・1列おきに半分ずらす）
    列：8÷0.91＝8.79 → 9列（0,2,4,6,8番＝そろい／1,3,5,7番＝0.91ずらし）
    そろいの列：12÷1.82＝6.59 → 1.82m×6＋1.08m ＝ 7か所 ×5列＝35
    ずらしの列：0.91m＋1.82m×6＋0.17m ＝ 8か所 ×4列＝32   → 合計 67か所
    板の枚数：まるごと 6×9＝54枚。切り物＝1.08m×5（1枚ずつ＝5枚・残り0.74m）、0.91m×4（2つで1枚＝2枚）、0.17m×4（1.08の残りに入る）→ 54＋5＋2＝61枚 */
 ck(Math.abs(q[1].area-96)<0.01&&q[1].n===67&&q[1].rolls===61,'2 断熱材：96㎡・67か所・61枚（'+JSON.stringify(q[1])+'）');
 ck(q[2].n===18&&q[2].rolls===11&&q[3].n===20&&q[3].rolls===13,'3・4 シートの数量は断熱材があっても同じ（18枚11巻／20枚13巻）');
 const meas=()=>p.evaluate(()=>{ let lo=1e9,hi=-1e9,v=0,n=0; T.group.traverse(o=>{ if(o.name==='nnMkLayer'){ n++; o.updateMatrixWorld(true); const a=o.geometry.attributes.position; v+=a.count;
     for(let i=0;i<a.count;i++){ const y=a.getY(i); if(y<lo)lo=y; if(y>hi)hi=y; } } }); return {n,v,lo,hi}; });
 await p.evaluate(()=>nnMkSet(0)); await p.waitForTimeout(1500); const m0=await meas();
 await p.evaluate(()=>nnMkSet(1)); await p.waitForTimeout(1500); const m1=await meas();
 ck(m1.n===1&&Math.abs((m1.hi-m0.hi)-(0.006+0.05+0.002))<0.002,'工程2：板の天端が プライマーより 厚み50mm ぶん高い（差 '+((m1.hi-m0.hi)*1000).toFixed(1)+'mm）');
 await p.evaluate(()=>nnMkSet(3)); await p.waitForTimeout(1500); const m3=await meas();
 ck(m3.hi-m0.hi>0.05+0.012,'工程4：上のシートが断熱材の厚みぶん上にある（プライマーとの差 '+((m3.hi-m0.hi)*1000).toFixed(1)+'mm）');
 if(process.env.SHOT) await p.screenshot({path:process.env.SHOT+'_4.png'});
 /* めくり：角（0.12＋0.3, 0.12＋0.3 のあたり）の真上から下へ見て、最初に当たる層の色が「下塗り」になる。めくらないときは「露出シート」 */
 const hit=()=>p.evaluate(()=>{ return [[0.5,0.5],[11.5,0.5],[0.5,7.5],[11.5,7.5]].map(P=>{ const rc=new THREE.Raycaster(new THREE.Vector3(P[0],5,P[1]),new THREE.Vector3(0,-1,0)); let best=null;
   T.group.traverse(o=>{ if(o.name==='nnMkLayer'){ rc.intersectObject(o).forEach(h=>{ if(!best||h.distance<best.distance) best=h; }); } });
   if(!best) return ''; const c=best.object.geometry.attributes.color, i=best.face.a; return [c.getX(i),c.getY(i),c.getZ(i)].map(v=>Math.round(v*255)).join(); }); });
 const h0=await hit();
 await p.evaluate(()=>{ const x=document.querySelector('#nnMkQty .pl'); if(x) x.click(); }); await p.waitForTimeout(1500);
 const h1=await hit();
 /* 4つの角を真上から見る：めくる前は4つとも露出シート。めくると1つの角だけ下塗り（§1424：#7e838c を逆算した 53,58,67）になる */
 const nb=h1.filter(c=>c==='53,58,67').length;
 const SH=c=>c==='143,140,120'||c==='161,158,136';   /* 露出シートは1枚おきに2色 */
 ck(h0.every(SH)&&nb===1&&h1.filter(SH).length===3,'めくる：4つの角のうち1つだけ、一番上が 露出シート → 下塗り に変わる（前 '+h0.join(' / ')+'｜後 '+h1.join(' / ')+'）');
 if(process.env.SHOT) await p.screenshot({path:process.env.SHOT+'_peel.png'});
 /* §1422 途中：工程2（断熱材）で 30／67 にすると、3Dの板は30枚だけ。
    数え方は屋根いっぱい（67）。3D は壁の下を除いて描くので、右はしの 0.17m の切り物（4枚）は見えないが、30枚目までには入らない（1列目7枚＋2列目8枚＋3列目7枚＋4列目8枚＝30。ずらしの列＝2列目と4列目の最後の1枚ずつが 0.17m で壁の下）→ 見える板は 28枚 */
 await p.evaluate(()=>{ const x=document.querySelector('#nnMkQty .pl'); if(x) x.click(); }); await p.waitForTimeout(800);
 await p.evaluate(()=>nnMkSet(1)); await p.waitForTimeout(1500);
 const lab0=await p.evaluate(()=>{ const g=document.querySelector('#nnMkQty .pg'); return g?g.textContent.replace(/\s+/g,''):''; });
 ck(/途中67／67枚/.test(lab0),'工程2：途中のつまみが出る・最初は全部（'+lab0+'）');
 await p.evaluate(()=>{ const r=document.querySelector('#nnMkQty .pg input'); if(r){ r.value='30'; r.dispatchEvent(new Event('input',{bubbles:true})); r.dispatchEvent(new Event('change',{bubbles:true})); } }); await p.waitForTimeout(1500);
 /* §1424 敷く順番＝階段状：（列の番号＋列の中の番号）の小さい順。合計が 0,1,…,6 の板は 1+2+…+7＝28枚、合計7は列1〜7に1枚ずつ（列0は7枚しか無い）→ 30枚目までは 列1の7番目・列2の6番目まで。
    壁の下に隠れる 0.17m の切り物は、ずらしの列の8番目（合計8以上）なので、30枚目までには入らない → 見える板は30枚 */
 /* 板の天端（§1423：画面に #48484c／#58585c で出るように逆算した色。§1424 で写真の実測 #484645／#545250 に＝17,16,15／23,22,20）の頂点だけ数える：板1枚＝6頂点。途中のときは下の塗り（下塗り）も描くので、全部の頂点では数えない */
 const mp={v:await p.evaluate(()=>{ let n=0; T.group.traverse(o=>{ if(o.name==='nnMkLayer'){ const c=o.geometry.attributes.color; for(let i=0;i<c.count;i++){ const k=[c.getX(i),c.getY(i),c.getZ(i)].map(v=>Math.round(v*255)).join(); if(k==='17,16,15'||k==='23,22,20') n++; } } }); return n; })}, lab1=await p.evaluate(()=>{ const g=document.querySelector('#nnMkQty .pg'); return g?g.textContent.replace(/\s+/g,''):''; });
 ck(mp.v===180&&/途中30／67枚/.test(lab1),'途中 30／67：3Dの板は30枚（階段状の順・壁の下に入る板なし・天端の頂点 '+mp.v+'＝30×6）・表示（'+lab1+'）');
 if(process.env.SHOT) await p.screenshot({path:process.env.SHOT+'_tochu.png'});
 /* §1426 厚み（この図面だけ）と 透かす */
 await p.evaluate(()=>{ const r=document.querySelector('#nnMkQty .pg input'); r.value=r.max; r.dispatchEvent(new Event('change',{bubbles:true})); }); await p.waitForTimeout(1200);
 await p.evaluate(()=>{ const t=document.querySelector('#nnMkQty .pg select'); if(t){ t.value='30'; t.dispatchEvent(new Event('change',{bubbles:true})); } }); await p.waitForTimeout(1500);
 const m30=await meas(), row=await p.evaluate(()=>{ const r=document.querySelector('#nnMkQty tr.on'); return r?r.textContent:''; });
 const sp30=await p.evaluate(()=>JSON.parse(localStorage.getItem('nn_specs_v1')).items[0].steps[1].mk.t);
 ck(Math.abs((m30.hi-m0.hi)-(0.006+0.030+0.004))<0.002&&/厚30mm/.test(row)&&sp30===50,'厚みを30mmに：板の天端がプライマーより 30mm ぶん高い（差 '+((m30.hi-m0.hi)*1000).toFixed(1)+'mm）・表も厚30mm・仕様の値は50のまま（'+sp30+'）');
 const sk0=await p.evaluate(()=>{ let n=0; T.group.traverse(o=>{ if(o.name==='nnMkLayerSkel') n++; }); return n; });
 await p.evaluate(()=>{ const x=document.querySelector('#nnMkQty .sk'); if(x) x.click(); }); await p.waitForTimeout(1500);
 const sk1=await p.evaluate(()=>{ let n=0,v=0,op=1,tr=false; T.group.traverse(o=>{ if(o.name==='nnMkLayerSkel'){ n++; v+=o.geometry.attributes.position.count; op=o.material.opacity; tr=o.material.transparent; } }); return {n,v,op,tr}; });
 /* 透かした板の面：天端 67枚×6＝402 頂点より多い（側面のぶん）。色の濃い面は元の形（nnMkLayer）から無くなる */
 const topLeft=await p.evaluate(()=>{ let n=0; T.group.traverse(o=>{ if(o.name==='nnMkLayer'){ const c=o.geometry.attributes.color; for(let i=0;i<c.count;i++){ const k=[c.getX(i),c.getY(i),c.getZ(i)].map(v=>Math.round(v*255)).join(); if(k==='17,16,15') n++; } } }); return n; });
 ck(sk0===0&&sk1.n===1&&sk1.tr&&sk1.op<0.6&&sk1.v>=402&&topLeft===0,'透かす：板の面が半透明の形に移る（前 '+sk0+'→後 '+JSON.stringify(sk1)+'・元の形に残る天端 '+topLeft+'）');
 if(process.env.SHOT) await p.screenshot({path:process.env.SHOT+'_skel.png'});
 await p.evaluate(()=>{ const x=document.querySelector('#nnMkQty .sk'); if(x) x.click(); delete state.d3mkT; }); await p.waitForTimeout(800);
 await p.evaluate(()=>nnMkSet(2)); await p.waitForTimeout(1200);
 ck(await p.evaluate(()=>state.d3mkN===undefined),'工程を変えると途中はやめる（全部置いた状態から）');
}
console.log('errors',errs.slice(0,5)); console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
