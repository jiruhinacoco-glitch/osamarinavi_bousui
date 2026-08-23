/* ★2026-08-23w 選択ボタンの解除／天端の謎のライン／平場と天端の独立（§166）
   node _check/deck2.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):''));if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
p.on('dialog',d=>d.accept()); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ state.polys=[];state.parts=[];state.d3sol=[];state.scaleM=1;state.specCode='AS-T1';
  drawPts=[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}]; closePoly(); });
await p.waitForTimeout(400);
/* ① 選択ボタンのトグル */
await p.evaluate(()=>document.getElementById('tl_sel').click()); await p.waitForTimeout(200);
let a=await p.evaluate(()=>({t:tool,on:document.getElementById('tl_sel').classList.contains('on')}));
ok(a.t==='sel'&&a.on,'①選択ボタンを押すと選択になる',a);
await p.evaluate(()=>document.getElementById('tl_sel').click()); await p.waitForTimeout(200);
a=await p.evaluate(()=>({t:tool,on:document.getElementById('tl_sel').classList.contains('on')}));
ok(a.t!=='sel'&&!a.on,'①もう一度押すとボタンの点灯が消える（解除）',a);
await p.evaluate(()=>document.getElementById('tl_sel').click()); await p.waitForTimeout(200);
ok(await p.evaluate(()=>tool)==='sel','①もう一度押すと選び直せる');
/* 3D */
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4300);
/* ② 天端の上に横切る継目が無い */
/* 辺0は z=0 の線。外向きは -z、屋根の内側は +z。壁の厚みは 250mm（天端幅W）。
   「天端の上（y≈0.31）で、内側の面取り（th-CH）より外側にある継目」＝外壁側の謎のライン */
const SEAM=`()=>{ let out=0,side=0;
  const e=state.polys[0].edges[0], hh=(e.h||300)/1000, th=Math.max((e.w||250)/1000,0.08), CH=Math.min(0.02,th/4,hh/4);
  T.group.traverse(o=>{ if(!(o.isMesh&&o.material&&o.material.color&&o.material.color.getHex()===0x14120f))return;
    if(Math.abs(o.position.x-10)>9) return;                 /* 辺0の上だけ見る */
    if(o.position.y>hh-0.01 && o.position.z>-0.001 && o.position.z<th-CH-0.01) out++;
    else side++; });
  return {外壁側の線:out, その他:side}; }`;
const sm=await p.evaluate(`(${SEAM})()`);
ok(sm['外壁側の線']===0,'②パラペットの天端の外壁側に「謎のライン」が無い',sm);
ok(sm['その他']>0,'②立上りの継目そのものは残っている',sm);
/* ③ 平場を上げる：天端は残る・側面が出る・躯体は動かない */
const PARA=`()=>{ let n=0,maxy=0; T.group.traverse(o=>{ if(o.isMesh&&o.geometry&&o.geometry.type==='ExtrudeGeometry'){
    o.geometry.computeBoundingBox(); const h=o.geometry.boundingBox.max.y-o.geometry.boundingBox.min.y;
    if(h>0.2&&h<0.4){ n++; maxy=Math.max(maxy,o.position.y); } } }); return {para:n, top:+maxy.toFixed(2)}; }`;
const BODY=`()=>{let m=null,r=null;T.group.traverse(o=>{if(o.name==='nnBody')m=o; if(o.name==='nnDeckBody')r=o;});
  const g=x=>{ if(!x)return null; x.geometry.computeBoundingBox(); const bb=x.geometry.boundingBox;
    return {top:+x.position.y.toFixed(2), h:+(bb.max.y-bb.min.y).toFixed(2)}; };
  return {body:g(m), riser:g(r)}; }`;
const p0=await p.evaluate(`(${PARA})()`), b0=await p.evaluate(`(${BODY})()`);
await p.evaluate(()=>{ state.polys[0].lv=2; dirty3d=true; build3D(); }); await p.waitForTimeout(800);
const p1=await p.evaluate(`(${PARA})()`), b1=await p.evaluate(`(${BODY})()`);
ok(p1.para===p0.para && Math.abs(p1.top-p0.top)<0.01,'③天端（パラペット）は同じ位置に残る',{前:p0,後:p1});
ok(b1.body && Math.abs(b1.body.top-b0.body.top)<0.01,'③躯体（建物）の高さは変わらない',{前:b0.body,後:b1.body});
ok(b1.riser && Math.abs(b1.riser.h-2)<0.05 && Math.abs(b1.riser.top-2)<0.05,
   '③平場の下に高さ2mの床スラブができる＝四方に側面が出る',b1.riser);
const mem=await p.evaluate(()=>{let y=null;T.group.traverse(o=>{if(o.userData&&o.userData.polyIdx!=null)y=+o.position.y.toFixed(2);});return y;});
ok(Math.abs(mem-2.01)<0.05,'③平場（防水面）は2mに上がる',mem);
/* 天端が床スラブに飲み込まれていない（外周に見えている） */
const VIS=`()=>{ let r=null; T.group.traverse(o=>{ if(o.name==='nnDeckBody'){ o.geometry.computeBoundingBox();
    const bb=o.geometry.boundingBox; r={x0:+bb.min.x.toFixed(2), x1:+bb.max.x.toFixed(2)}; } });
  return r; }`;
const ri=await p.evaluate(`(${VIS})()`);
ok(ri && ri.x0>0.05 && ri.x1<19.95,'③床スラブは天端の内側に立つ（天端が隠れない）',ri);
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await p.evaluate(()=>{T.theta=-0.8;T.phi=1.05;T.rev++;}); await p.waitForTimeout(1200);
await p.screenshot({path:'/tmp/w1.png'});
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
