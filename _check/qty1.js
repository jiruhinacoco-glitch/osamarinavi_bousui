/* 数量と見積の数字が、図形から手で計算した値と合うか（商売の根幹）
   ★「その場の計算をもう一度呼ぶ」のではなく、**別の道すじで計算した値**と突き合わせる。
     同じ関数で検算すると、間違っていても必ず一致してしまう（§117s の教訓）。
   使い方: node _check/qty1.js   （先に python3 -m http.server 8899 を立てる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0;
const near=(a,b,t)=>Math.abs(a-b)<(t||0.02);
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1500,height:900}})).newPage();
p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,90)));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1600);
await p.evaluate(()=>{try{nnZMenuClose()}catch(_){}});

const cmp=(title, got, want)=>{
  const all=Object.keys(want).every(k=>near(got[k],want[k]));
  if(!all)ng++;
  console.log((all?'○ ':'★NG ')+title);
  Object.keys(want).forEach(k=>{
    if(!near(got[k],want[k])) console.log('     ★ '+k+' : 出た値 '+got[k]+' ／ 手計算 '+(+want[k].toFixed(3)));
  });
};

/* ① 長方形 10×8・立上り300・天端250 */
cmp('① 10m×8m 長方形（立上り300／天端250）', await p.evaluate(()=>{
  state.scaleM=1; state.polys=[]; state.parts=[]; state.d3sol=[];
  const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
  state.polys.push({name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))});
  state.active=0; recalc();
  const q=quantities(state.polys[0],state.scaleM);
  return {平場:q.hira, 立上り:q.tachi, 天端:q.tenba, 周長:q.per};
}), {平場:80, 立上り:36*0.3, 天端:36*0.25, 周長:36});

/* ② 中抜き（穴の縁にも立上りが立つ） */
cmp('② 2m×3m の穴あき（穴の縁も立上り300）', await p.evaluate(()=>{
  const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
  const hp=[{x:3,y:3},{x:5,y:3},{x:5,y:6},{x:3,y:6}];
  state.polys=[{name:'A',lv:0,pts,holes:[{pts:hp,edges:hp.map(()=>({h:300,w:250,k:'para'}))}],
                edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
  state.active=0; recalc();
  const q=quantities(state.polys[0],state.scaleM);
  return {平場:q.hira, 立上り:q.tachi, 天端:q.tenba, 周長:q.per};
}), {平場:74, 立上り:46*0.3, 天端:46*0.25, 周長:46});

/* ③ 立上りなしの辺が混ざる */
cmp('③ 4辺のうち1辺だけ立上りなし', await p.evaluate(()=>{
  const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
  const eds=pts.map(()=>({h:300,w:250,k:'para'})); eds[0]={h:0,w:0,k:'free'};
  state.polys=[{name:'A',lv:0,pts,holes:[],edges:eds}];
  state.active=0; recalc();
  const q=quantities(state.polys[0],state.scaleM);
  return {平場:q.hira, 立上り:q.tachi, 天端:q.tenba};
}), {平場:80, 立上り:26*0.3, 天端:26*0.25});

/* ④ 斜めの辺（面積は靴ひも公式・辺の長さは三平方の定理で手計算） */
{
  const pts=[[0,0],[12,0],[12,5],[6,9],[0,5]];
  let A=0,P=0;
  for(let i=0;i<pts.length;i++){ const a=pts[i], c=pts[(i+1)%pts.length];
    A+=a[0]*c[1]-c[0]*a[1]; P+=Math.hypot(c[0]-a[0], c[1]-a[1]); }
  A=Math.abs(A)/2;
  cmp('④ 斜めの辺のある5角形（靴ひも公式・三平方の定理と突き合わせ）', await p.evaluate(pts=>{
    const P2=pts.map(q=>({x:q[0],y:q[1]}));
    state.polys=[{name:'A',lv:0,pts:P2,holes:[],edges:P2.map(()=>({h:400,w:200,k:'para'}))}];
    state.active=0; recalc();
    const q=quantities(state.polys[0],state.scaleM);
    return {平場:q.hira, 立上り:q.tachi, 天端:q.tenba, 周長:q.per};
  },pts), {平場:A, 立上り:P*0.4, 天端:P*0.2, 周長:P});
}

/* ⑤ 水切りアゴ（出100＋垂れ40＝140mm ぶんの面積が別に立つ） */
cmp('⑤ 水切りアゴ（出100＋垂れ40）', await p.evaluate(()=>{
  const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
  const eds=pts.map(()=>({h:300,w:250,k:'para'}));
  eds[1].ago=1; eds[1].agoD=100;               /* 長さ8mの辺にアゴ */
  state.polys=[{name:'A',lv:0,pts,holes:[],edges:eds}];
  state.active=0; recalc();
  const q=quantities(state.polys[0],state.scaleM);
  return {アゴ長さ:q.agoL, アゴ面積:q.agoA};
}), {アゴ長さ:8, アゴ面積:8*(100+40)/1000});

/* ⑥ 1マス＝0.5m のとき（縮尺が効いているか） */
cmp('⑥ 1マス0.5m：同じ格子でも面積は4分の1', await p.evaluate(()=>{
  state.scaleM=0.5;
  const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
  state.polys=[{name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
  state.active=0; recalc();
  const q=quantities(state.polys[0],state.scaleM);
  return {平場:q.hira, 周長:q.per};
}), {平場:20, 周長:18});

/* ⑦ 見積の金額＝数量×単価（丸めたあとの数量で掛けているか） */
{
  const r=await p.evaluate(()=>{
    state.scaleM=1; state.specCode='AS-T1';
    const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
    state.polys=[{name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; recalc();
    const d=window.nnEstimateData?nnEstimateData():null;
    if(!d)return {なし:1};
    return {行:d.rows.map(x=>({名:x.name,数:x.qty,単:x.unitPrice,金:x.amount})), 小計:d.subtotal};
  });
  if(r.なし){ console.log('★NG ⑦ 見積データが取れない'); ng++; }
  else{
    let bad=[];
    r.行.forEach(x=>{ const w=Math.round(x.数*x.単);
      if(Math.abs(w-x.金)>1) bad.push(x.名+' '+x.数+'×'+x.単+'='+w+' なのに '+x.金); });
    const st=r.行.reduce((a,x)=>a+x.金,0);
    if(bad.length){ console.log('★NG ⑦ 金額が 数量×単価 と合わない'); bad.forEach(t=>console.log('     ★ '+t)); ng++; }
    else console.log('○ ⑦ 金額＝表示している数量×単価（'+r.行.length+'行とも一致）');
    if(Math.abs(st-r.小計)>1){ console.log('★NG ⑦ 小計が行の合計と合わない '+st+' / '+r.小計); ng++; }
    else console.log('○ ⑦ 小計＝各行の合計');
  }
}

/* ⑧ 元請に出す紙（平面図PDF）に、画面と同じ数量が出るか
   ★ここがずれると、画面では合っているのに紙だけ違う＝いちばん信用を落とす失敗になる。 */
{
  const r=await p.evaluate(()=>{
    state.scaleM=1; state.polys=[]; state.parts=[]; state.d3sol=[];
    const A=[{x:0,y:0},{x:12,y:0},{x:12,y:9},{x:0,y:9}];
    const H=[{x:4,y:3},{x:6,y:3},{x:6,y:5},{x:4,y:5}];
    state.polys=[{name:'屋根①',lv:0,pts:A,holes:[{pts:H,edges:H.map(()=>({h:300,w:250,k:'para'}))}],
      edges:A.map(()=>({h:400,w:250,k:'para'}))}];
    state.active=0; state.specCode='AS-T1'; recalc();
    const q=quantities(state.polys[0],state.scaleM);
    let svg=''; const _open=window.open;
    window.open=function(){ return {document:{write(h){svg+=h;},close(){}},focus(){},print(){},addEventListener(){},location:{}}; };
    let err=null; try{ nnPlanPDF(); }catch(e){ err=e.message; }
    window.open=_open;
    const nums=[...new Set((svg.match(/(\d+(?:\.\d+)?)\s*(?:㎡|m2)/g)||[]).map(x=>parseFloat(x)))];
    return {画面:+q.hira.toFixed(1), 紙:nums, err, 長さ:svg.length};
  });
  if(r.err){ console.log('★NG ⑧平面図PDFでエラー: '+r.err); ng++; }
  else{
    const hit=r.紙.some(x=>Math.abs(x-r.画面)<0.15);
    if(!hit)ng++;
    console.log((hit?'○ ':'★NG ')+'⑧平面図PDFに画面と同じ平場が出る（画面 '+r.画面+'㎡ ／ 紙 '+JSON.stringify(r.紙)+'）');
  }
}

if(errs.length){ console.log('★NG JSエラー '+errs.slice(0,2).join(' / ')); ng++; }
else console.log('○ JSエラーなし');
console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
await b.close(); process.exit(ng?1:0);
})();
