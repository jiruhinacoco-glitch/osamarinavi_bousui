/* ★2026-10-11i 仕様・材料の「3D工程イラスト」（step3d.js・§637）：
   ① A-1 を押すと #st3d に 3D（canvas）が出る・下地＋9工程の形・札「全体（完成形）」・矢印9本が済み
   ② 工程3を押す → 札「工程 3」・形は下地＋3工程・矢印の3本目が「今」・実際に三角形が描かれている
   ③ 「大きく」→ 全画面の dialog に同じ絵（canvas が画面の9割以上）・見出し「工程 3／9」・「次の工程」で工程4・閉じると #st3d に戻る
   ④ 3Dが無い仕様（A-2）を押すと canvas は無く「3D工程イラスト 準備中」（NN_STEP3D が false）
   ⑤ 模型は枠からはみ出さず、枠の高さの5割以上（カメラで投影して測る・罠16）
   ⑥ pageerror 0
   直す前の版（step3d.js を読み込まない）では ① が★NG。
   使い方: node _check/step3d.js [shiyo_toroku.html の代わり] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'shiyo_toroku.html';
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,240):'')); if(!c)NG++;};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 try{ for(const [nm,vp,mob] of [['PC',{viewport:{width:1440,height:900}},0],['スマホ',{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true},1]]){
  const p=await b.newPage(vp); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(mob) await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});localStorage.setItem('nn_view_mode','mobile');}catch(e){}});
  await p.goto('http://localhost:8899/'+F); await p.waitForTimeout(1500);
  const pick=async code=>{ await p.evaluate(c=>{ const r=[...document.querySelectorAll('#list .mrow')].find(x=>x.querySelector('.code').firstChild.textContent.trim()===c); r&&r.click(); },code); await p.waitForTimeout(200); };
  /* ① */
  await pick('A-1');
  let got=false; try{ await p.waitForFunction(()=>{ const c=document.querySelector('#st3d .s3root canvas'); return c&&c.width>0&&c.height>0; },null,{timeout:15000}); got=true; }catch(e){}
  const t1=await p.evaluate(()=>{ const el=document.getElementById('st3d'), c=el&&el.querySelector('.s3root canvas'), V=window.NN_STEP3D&&window.NN_STEP3D.inspect&&window.NN_STEP3D.inspect();
    return {canvas:!!c, w:c&&c.width, h:c&&c.height, kids:V&&V.model.children.length, lab:(el.querySelector('.stlab')||{}).textContent, on:el.querySelectorAll('.stbar i.on').length, n:el.querySelectorAll('.stbar i').length, soon:!!el.querySelector('.stsoon')}; });
  ok(nm+' ① A-1 を押すと #st3d に 3D・下地＋9工程・札「全体（完成形）」・矢印9本が済み', got&&t1.canvas&&t1.w>0&&t1.kids===10&&t1.lab==='全体（完成形）'&&t1.on===9&&t1.n===9&&!t1.soon, t1);
  /* ② */
  const t2=await p.evaluate(()=>{ nnStepSel(2); const V=window.NN_STEP3D.inspect(); V.renderer.render(V.scene,V.camera); const el=document.getElementById('st3d'), bars=[...el.querySelectorAll('.stbar i')];
    return {lab:(el.querySelector('.stlab')||{}).textContent, kids:V.model.children.length, cur:bars.findIndex(i=>i.classList.contains('cur')), on:bars.filter(i=>i.classList.contains('on')).length, tri:V.renderer.info.render.triangles, row:(document.querySelector('.step-tbl tr.strow.on')||{dataset:{}}).dataset.i}; });
  ok(nm+' ② 工程3 → 札「工程 3」・下地＋3工程・矢印の3本目が今・三角形が描かれている・表の行も3', t2.lab==='工程 3'&&t2.kids===4&&t2.cur===2&&t2.on===3&&t2.tri>1000&&t2.row==='2', t2);
  /* ③ */
  await p.evaluate(()=>document.querySelector('#st3d [data-nav=big]').click()); await p.waitForTimeout(300);
  const t3a=await p.evaluate(()=>{ const d=document.querySelector('dialog.s3big'), c=d&&d.querySelector('.s3root canvas'), r=c&&c.getBoundingClientRect();
    return {open:!!(d&&d.open), cw:r&&r.width, ch:r&&r.height, vw:document.documentElement.clientWidth, vh:document.documentElement.clientHeight, h2:d&&d.querySelector('h2').textContent}; });
  await p.evaluate(()=>document.querySelector('dialog.s3big [data-next]').click()); await p.waitForTimeout(200);
  const t3b=await p.evaluate(()=>({lab:document.querySelector('dialog.s3big .stlab').textContent, h2:document.querySelector('dialog.s3big h2').textContent, kids:window.NN_STEP3D.inspect().model.children.length}));
  await p.evaluate(()=>document.querySelector('dialog.s3big [data-close]').click()); await p.waitForTimeout(300);
  const t3c=await p.evaluate(()=>({dlg:!!document.querySelector('dialog.s3big'), back:!!document.querySelector('#st3d .s3root canvas'), lab:(document.querySelector('#st3d .stlab')||{}).textContent}));
  ok(nm+' ③ 「大きく」→ 全画面に同じ絵（画面の9割以上）・見出し「工程 3／9」・次の工程で工程4・閉じると #st3d に戻る',
    t3a.open&&t3a.cw>=t3a.vw*0.9&&t3a.ch>=t3a.vh*0.6&&/工程 3／9/.test(t3a.h2)&&t3b.lab==='工程 4'&&/工程 4／9/.test(t3b.h2)&&t3b.kids===5&&!t3c.dlg&&t3c.back&&t3c.lab==='工程 4', {t3a,t3b,t3c});
  /* ④ */
  if(mob) await p.evaluate(()=>{ const b=document.querySelector('.back-list'); b&&b.click(); });
  await pick('A-2');
  const t4=await p.evaluate(()=>{ const el=document.getElementById('st3d'); return {canvas:!!el.querySelector('canvas'), soon:(el.querySelector('.stsoon')||{}).textContent, has:window.NN_STEP3D.has('A-2')}; });
  ok(nm+' ④ 3Dが無い仕様（A-2）は canvas なし・「3D工程イラスト 準備中」', !t4.canvas&&/準備中/.test(t4.soon||'')&&!t4.has, t4);
  /* ⑤ 模型の見た目の大きさ：全体（完成形）の箱の8つの角を投影して、枠の中・高さの5割以上 */
  if(mob) await p.evaluate(()=>{ const b=document.querySelector('.back-list'); b&&b.click(); });
  await pick('A-1'); await p.waitForFunction(()=>document.querySelector('#st3d .s3root canvas'),null,{timeout:15000});
  const t5=await p.evaluate(()=>{ const V=window.NN_STEP3D.inspect(), T=V.T; V.renderer.render(V.scene,V.camera); const box=new T.Box3().setFromObject(V.model), c=V.canvas, w=c.clientWidth, h=c.clientHeight; let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for(let k=0;k<8;k++){ const v=new T.Vector3(k&1?box.max.x:box.min.x,k&2?box.max.y:box.min.y,k&4?box.max.z:box.min.z).project(V.camera); const x=(v.x+1)/2*w, y=(1-v.y)/2*h; x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); }
    return {w,h,x0:Math.round(x0),x1:Math.round(x1),y0:Math.round(y0),y1:Math.round(y1),hr:(y1-y0)/h}; });
  ok(nm+' ⑤ 模型は枠からはみ出さず、枠の高さの5割以上', t5.x0>=-1&&t5.x1<=t5.w+1&&t5.y0>=-1&&t5.y1<=t5.h+1&&t5.hr>=0.5, t5);
  /* ⑦（§638）枠の大きさ：PC は詳細の横幅の 55％以上・高さ 220px 以上・詳細はスクロールなし。スマホは横幅いっぱいの 16:10 */
  const t7=await p.evaluate(()=>{ const d=document.getElementById('detail'), el=document.getElementById('st3d'), r=el.getBoundingClientRect(), dr=d.getBoundingClientRect();
    return {w:Math.round(r.width), h:Math.round(r.height), dw:Math.round(dr.width), scroll:d.scrollHeight-d.clientHeight, ratio:r.width/r.height}; });
  ok(nm+(mob?' ⑦ 枠は横幅いっぱいの 16:10':' ⑦ 枠は詳細の横幅の55％以上・高さ220px以上・詳細はスクロールなし'),
    mob?(t7.w>=t7.dw*0.9&&Math.abs(t7.ratio-1.6)<0.05):(t7.w>=t7.dw*0.55&&t7.h>=220&&t7.scroll<=0), t7);
  /* ⑧（§638）溶融アスの縁がなめらか：縁の点の間隔が 1cm 以下・縁側に縦の面（厚さ）が無い（頂点の y が層の底と同じ） */
  const t8=await p.evaluate(()=>{ const V=window.NN_STEP3D.inspect(); let out=null;
    V.model.traverse(o=>{ if(out||!o.isMesh||o.material.userData.kind!=='asphalt'||!o.geometry.userData.wavy) return; const p=o.geometry.attributes.position, n=p.count/2; /* 前半＝底・後半＝表 */
      const {stride,rows}=o.geometry.userData; let gap=0, lip=0;
      for(let j=1;j<rows;j++){ gap=Math.max(gap,Math.hypot(p.getZ(j*stride)-p.getZ((j-1)*stride),p.getY(j*stride)-p.getY((j-1)*stride))); }
      for(let j=0;j<rows;j++){ lip=Math.max(lip,Math.abs(p.getY(n+j*stride)-p.getY(j*stride))+Math.abs(p.getZ(n+j*stride)-p.getZ(j*stride))); }
      out={gap:+gap.toFixed(4), lip:+lip.toFixed(4), rows, stride}; });
    return out; });
  ok(nm+' ⑧ 溶融アスの縁：点の間隔 1cm 以下（スマホ 2cm）・縁に縦の面が無い', t8&&t8.gap<=(mob?0.0201:0.0101)&&t8.lip<0.0005, t8);
  /* ⑨（§639）層に隙間が無い：各層の底の線（lo）の点が全部、前の層までの表面（prev の折れ線）の上にある（1mm の1/100 以内）。
     直す前の版（固定 39mm ずつ上げる）には V.layers が無い＝★NG */
  const t9=await p.evaluate(()=>{ const V=window.NN_STEP3D.inspect(); const ls=V.layers||[]; if(!ls.length) return {n:0};
    const dist=(pt,path)=>{ let best=1e9; for(let i=1;i<path.length;i++){ const a=path[i-1], b=path[i], dz=b[0]-a[0], dy=b[1]-a[1], l2=dz*dz+dy*dy||1e-18;
      let t=((pt[0]-a[0])*dz+(pt[1]-a[1])*dy)/l2; t=Math.max(0,Math.min(1,t)); best=Math.min(best,Math.hypot(pt[0]-(a[0]+dz*t),pt[1]-(a[1]+dy*t))); } return best; };
    let worst=0, bad=[]; ls.forEach((L,j)=>{ L.lo.forEach(pt=>{ const d=dist(pt,L.prev); worst=Math.max(worst,d); if(d>1e-5) bad.push(j+':'+L.kind); });
      if(j>0&&L.prev!==ls[j-1].path) bad.push(j+':prev≠前の表面'); });
    return {n:ls.length, worst:+worst.toExponential(2), bad:[...new Set(bad)].slice(0,6)}; });
  ok(nm+' ⑨ 層に隙間が無い（各層の底が前の表面に乗っている・順につながっている）', t9.n>=9&&t9.worst<1e-5&&!t9.bad.length, t9);
  /* ⑩（§639）丸ボタンの長押し：右回りを 700ms 押し続けると、1回押し（8°）より大きく回る */
  const t10=await p.evaluate(async()=>{ const V=window.NN_STEP3D.inspect(), b=document.querySelector('#st3d [data-nav=rr]'), r=b.getBoundingClientRect(), th0=V.theta;
    const ev=(t,extra)=>b.dispatchEvent(new PointerEvent(t,Object.assign({bubbles:true,cancelable:true,pointerId:7,pointerType:'touch',clientX:r.left+r.width/2,clientY:r.top+r.height/2,isPrimary:true},extra||{})));
    ev('pointerdown'); const once=V.theta-th0; await new Promise(r=>setTimeout(r,700)); ev('pointerup'); const held=V.theta-th0; await new Promise(r=>setTimeout(r,200));
    return {once:+once.toFixed(3), held:+held.toFixed(3), after:+(V.theta-th0).toFixed(3)}; });
  ok(nm+' ⑩ 丸ボタンの長押し：押しているあいだ回り続け、離すと止まる', Math.abs(t10.once-0.1396)<0.01&&t10.held>0.4&&t10.after===t10.held, t10);
  /* ⑪（§639）真上ボタン：図面・積算と同じ並びにあり、押すとほぼ真上（phi≦0.2）から見る */
  const t11=await p.evaluate(()=>{ const V=window.NN_STEP3D.inspect(), ks=[...document.querySelectorAll('#st3d .s3nav [data-nav]')].map(b=>b.dataset.nav); const b=document.querySelector('#st3d [data-nav=plan]'); b&&b.click(); return {ks, phi:+V.phi.toFixed(2), img:b&&/btn_d3_plan/.test(b.querySelector('img').src)}; });
  ok(nm+' ⑪ 真上ボタンがあり（左回り…倒す・真上・拡大・縮小・全体）押すと真上', t11.ks.join()==='rl,rr,tup,tdn,plan,zin,zout,iso'&&t11.phi<=0.2&&t11.img, t11);
  /* ⑫（§639）つまみ：PC だけ。右端のつまみを左へ 100px → 3Dの幅が 100px 減る／下のつまみを下へ 80px → 高さが 80px 増える／保存され、開き直しても同じ／ダブルクリックで元に戻る */
  if(!mob){
    const g=async(sel,dx,dy)=>{ const b=await p.locator(sel).boundingBox(); await p.mouse.move(b.x+b.width/2,b.y+b.height/2); await p.mouse.down(); await p.mouse.move(b.x+b.width/2+dx/2,b.y+b.height/2+dy/2); await p.mouse.move(b.x+b.width/2+dx,b.y+b.height/2+dy); await p.mouse.up(); await p.waitForTimeout(150); };
    const sz=()=>p.evaluate(()=>{ const r=document.getElementById('st3d').getBoundingClientRect(); return [Math.round(r.width),Math.round(r.height)]; });
    const s0=await sz(); await g('.stage .stgrip.x',-100,0); const s1=await sz(); await g('.stage .stgrip.y',0,80); const s2=await sz();
    const saved=await p.evaluate(()=>localStorage.getItem('nn_stage_size'));
    await p.reload(); await p.waitForTimeout(1200); await pick('A-1'); await p.waitForTimeout(300); const s3=await sz();
    await p.locator('.stage .stgrip.xy').dblclick(); await p.waitForTimeout(150); const s4=await sz();
    ok(nm+' ⑫ つまみ：右端で幅−100・下で高さ＋80・保存される・開き直しても同じ・角のダブルクリックで元に戻る',
      Math.abs(s1[0]-(s0[0]-100))<=2&&Math.abs(s2[1]-(s1[1]+80))<=2&&/"w":\d+/.test(saved||'')&&/"h":\d+/.test(saved||'')&&s3[0]===s2[0]&&s3[1]===s2[1]&&s4[0]===s0[0]&&s4[1]===s0[1], {s0,s1,s2,s3,s4,saved});
  }
  ok(nm+' ⑥ pageerror 0', errs.length===0, errs);
  await p.close(); }
 }finally{ await b.close(); }
 console.log(NG?'★NG '+NG+'件':'全部○'); process.exit(NG?1:0); })();
