/* 図面・積算：スマホで頂点どうしをつなげるか（2026-10-25c）
   既存の図形の角（方眼から外れた角も含む）を照準で少しずれて狙ったとき、
   ①1点目（始点）が角に吸い付くか ②2点目以降が角に吸い付くか を、実際のタップで確かめる。
   使い方: node _check/zuvert.js [ファイル名.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'zumen_sekisan.html';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
let ng=0; const ok=(c,m,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)ng++;};
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:UA});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof setTool==='function'&&typeof draw==='function'&&typeof nnZMenuClose==='function');
  await p.evaluate(()=>{ try{nnZMenuClose();}catch(e){} });
  await p.waitForTimeout(500);
  /* 方眼から外れた角を持つ屋根（1cm単位の長方形でできる形） */
  const V=[{x:1.37,y:1.21},{x:6.53,y:1.21},{x:6.53,y:5.08},{x:1.37,y:5.08}];
  await p.evaluate(V=>{ state.scaleM=1; state.polys=[{name:'屋根①',lv:0,pts:V.map(v=>({...v})),edges:V.map(()=>({k:'para',h:600,w:250}))}];
    state.active=-1; drawPts=[]; setTool('draw');
    /* 図形を作図面の真ん中（道具ボタンの下）へ置く */
    const W=cv.width/devicePixelRatio, H=cv.height/devicePixelRatio; cellPx=Math.max(cellPx,40); ox=W/2-4*cellPx; oy=H*0.55-3.1*cellPx; draw(); },V);
  await p.waitForTimeout(400);
  const scr=(g,dx,dy)=>p.evaluate(([g,dx,dy])=>{ const r=cv.getBoundingClientRect();
    const kx=r.width?(cv.width/devicePixelRatio)/r.width:1, ky=r.height?(cv.height/devicePixelRatio)/r.height:1;
    /* 照準は指の右上 36px／52px（画面の見た目のpx） */
    return {x:r.left+(g.x*cellPx+ox)/kx-36+dx, y:r.top+(g.y*cellPx+oy)/ky+52+dy, cell:cellPx, kx}; },[g,dx,dy]);
  const near=(a,v)=>a&&Math.hypot(a.x-v.x,a.y-v.y)<1e-6;
  /* 指の誤差：見た目で 6px ずれた所を押す */
  let t=await scr(V[1],6,-5); await p.touchscreen.tap(t.x,t.y); await p.waitForTimeout(150);
  let s=await p.evaluate(()=>drawPts.map(q=>({x:q.x,y:q.y})));
  ok(near(s[0],V[1]),'①始点が既存の角（方眼から外れた角）に吸い付く',{打点:s[0],角:V[1],cellPx:t.cell});
  t=await scr(V[2],-6,5); await p.touchscreen.tap(t.x,t.y); await p.waitForTimeout(150);
  s=await p.evaluate(()=>drawPts.map(q=>({x:q.x,y:q.y})));
  ok(near(s[1],V[2]),'②2点目が既存の角に吸い付く（6pxずれ）',{打点:s[1],角:V[2]});
  t=await scr({x:9.4,y:3.1},0,0); await p.touchscreen.tap(t.x,t.y); await p.waitForTimeout(150);
  s=await p.evaluate(()=>drawPts.map(q=>({x:q.x,y:q.y})));
  ok(s.length===3 && !near(s[2],V[2]) && !near(s[2],V[1]),'③角から遠い所は狙った所に打てる（吸い付かない）',{打点:s[2]});
  /* 縮小表示（指でつまんで小さくした状態）でも同じ */
  await p.evaluate(()=>{ drawPts=[]; cellPx=cellPx*0.45; const W=cv.width/devicePixelRatio, H=cv.height/devicePixelRatio; ox=W/2-4*cellPx; oy=H*0.55-3.1*cellPx; draw(); });
  t=await scr(V[0],5,5); await p.touchscreen.tap(t.x,t.y); await p.waitForTimeout(150);
  t=await scr(V[3],-5,-5); await p.touchscreen.tap(t.x,t.y); await p.waitForTimeout(150);
  s=await p.evaluate(()=>drawPts.map(q=>({x:q.x,y:q.y})));
  ok(near(s[0],V[0])&&near(s[1],V[3]),'④縮小表示でも始点・2点目が角に吸い付く（5pxずれ）',{打点:s,cellPx:await p.evaluate(()=>cellPx)});
  ok(!errs.length,'⑤JSエラーなし',errs.slice(0,2));
  await p.screenshot({path:process.env.SHOT||'/tmp/zuvert.png'});
  await b.close(); console.log(ng?'★NG '+ng+'件':'全項目○');
})().catch(e=>{console.log('★NG 実行エラー '+String(e.message||e).split('\n')[0]);process.exit(1);});
