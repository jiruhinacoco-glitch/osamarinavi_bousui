/* ★2026-10-11i 仕様・材料の「3D工程イラスト」（step3d.js・§637）：
   ① A-1 を押すと #st3d に 3D（canvas）が出る・下地＋9工程の形・札は全体のとき空（§667）・矢印9本が済み
   ② 工程3を押す → 札「工程 3」・形は下地＋3工程・矢印の3本目が「今」・実際に三角形が描かれている
   ③ 「大きく」→ 全画面の dialog に同じ絵（canvas が画面の9割以上）・見出し「工程 3／9」・「次の工程」で工程4・閉じると #st3d に戻る
   ④ 3Dが無い仕様（A-2）を押すと canvas は無く「3D工程イラスト 準備中」（NN_STEP3D が false）
   ⑤ 模型は枠からはみ出さず、枠の高さの5割以上（カメラで投影して測る・罠16）
   ⑥ pageerror 0
   直す前の版（step3d.js を読み込まない）では ① が★NG。
   ⑯ 右側の辺にも立上り（§650）・⑰ 目地材はコンクリートの中だけ（§650）
   ⑱ 保護コンの切れ目のつまみ（§651）
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
  ok(nm+' ① A-1 を押すと #st3d に 3D・下地＋9工程・札は全体のとき空（§667）・矢印9本が済み', got&&t1.canvas&&t1.w>0&&t1.kids===10&&t1.lab===''&&t1.on===9&&t1.n===9&&!t1.soon, t1);
  /* ② */
  /* kids＝**見えている**群の数（§640 から全層を一度に作って表示／非表示で切り替える。children.length は常に 10） */
  const t2=await p.evaluate(()=>{ nnStepSel(2); const V=window.NN_STEP3D.inspect(); V.renderer.render(V.scene,V.camera); const el=document.getElementById('st3d'), bars=[...el.querySelectorAll('.stbar i')];
    return {lab:(el.querySelector('.stlab')||{}).textContent, kids:V.model.children.filter(g=>g.visible).length, cur:bars.findIndex(i=>i.classList.contains('cur')), on:bars.filter(i=>i.classList.contains('on')).length, tri:V.renderer.info.render.triangles, row:(document.querySelector('.step-tbl tr.strow.on')||{dataset:{}}).dataset.i}; });
  ok(nm+' ② 工程3 → 札「工程 3」・下地＋3工程・矢印の3本目が今・三角形が描かれている・表の行も3', t2.lab==='工程 3'&&t2.kids===4&&t2.cur===2&&t2.on===3&&t2.tri>1000&&t2.row==='2', t2);
  /* ③ */
  await p.evaluate(()=>document.querySelector('#st3d [data-nav=big]').click()); await p.waitForTimeout(300);
  const t3a=await p.evaluate(()=>{ const d=document.querySelector('dialog.s3big'), c=d&&d.querySelector('.s3root canvas'), r=c&&c.getBoundingClientRect();
    return {open:!!(d&&d.open), cw:r&&r.width, ch:r&&r.height, vw:document.documentElement.clientWidth, vh:document.documentElement.clientHeight, h2:d&&d.querySelector('h2').textContent}; });
  await p.evaluate(()=>document.querySelector('dialog.s3big [data-next]').click()); await p.waitForTimeout(200);
  const t3b=await p.evaluate(()=>({lab:document.querySelector('dialog.s3big .stlab').textContent, h2:document.querySelector('dialog.s3big h2').textContent, kids:window.NN_STEP3D.inspect().model.children.filter(g=>g.visible).length}));
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
  /* 点の間隔：§638 は 1cm → §640 で 1.5cm → §647（5m になった）で PC 2cm・スマホ 3cm */
  ok(nm+' ⑧ 溶融アスの縁：点の間隔 2cm 以下（スマホ 3cm）・縁に縦の面が無い', t8&&t8.gap<=(mob?0.0301:0.0201)&&t8.lip<0.0005, t8);
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
  /* ★クラウド（swiftshader＝ソフトウェア描画）は1コマの表示に 1〜4 秒かかり、20ms ごとの刻みが止まって見える（§648 実測）。
     ここで測るのはボタンの論理（角度の積み重ね）なので、測るあいだだけ描画（V.render）を止める */
  const t10=await p.evaluate(async()=>{ const V=window.NN_STEP3D.inspect(), b=document.querySelector('#st3d [data-nav=rr]'), r=b.getBoundingClientRect(), th0=V.theta, render0=V.render; V.render=()=>{};
    const ev=(t,extra)=>b.dispatchEvent(new PointerEvent(t,Object.assign({bubbles:true,cancelable:true,pointerId:7,pointerType:'touch',clientX:r.left+r.width/2,clientY:r.top+r.height/2,isPrimary:true},extra||{})));
    ev('pointerdown'); const once=V.theta-th0; await new Promise(r=>setTimeout(r,800)); ev('pointerup'); const held=V.theta-th0; await new Promise(r=>setTimeout(r,200)); const after=V.theta-th0;
    const th1=V.theta; ev('pointerdown'); await new Promise(r=>setTimeout(r,60)); ev('pointerup'); await new Promise(r=>setTimeout(r,50)); const tap=V.theta-th1; V.render=render0;
    return {once:+once.toFixed(3), held:+held.toFixed(3), after:+after.toFixed(3), tap:+tap.toFixed(3)}; });
  ok(nm+' ⑩ 丸ボタン（図面・積算と同じ）：押した瞬間は動かず、0.25秒後からゆっくり回り続け、離すと止まる。短く押す＝45°', t10.once===0&&t10.held>0.15&&t10.held<1.2&&t10.after===t10.held&&Math.abs(t10.tap-0.785)<0.02, t10);
  /* ⑪（§639）真上ボタン：図面・積算と同じ並びにあり、押すとほぼ真上（phi≦0.2）から見る */
  const t11=await p.evaluate(()=>{ const V=window.NN_STEP3D.inspect(), ks=[...document.querySelectorAll('#st3d .s3nav [data-nav]')].map(b=>b.dataset.nav); const b=document.querySelector('#st3d [data-nav=plan]'); b&&b.click(); return {ks, phi:+V.phi.toFixed(2), img:b&&/btn_d3_plan/.test(b.querySelector('img').src)}; });
  ok(nm+' ⑪ ボタンの並びは図面・積算と同じ（拡大・縮小・起こす・倒す・左回り・右回り・真上・全体）・真上を押すと真上', t11.ks.join()==='zin,zout,tup,tdn,rl,rr,plan,iso'&&t11.phi<=0.2&&t11.img, t11);
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
  /* ⑬（§640）張り掛けの端（フック）は各層とも同じ位置（z）に縦に積み重なる・完成形の表面は壁の中（z<-.78）や床の下（y<0）へ行かない・縦の折り返し（下がってから上がる）が無い */
  const t13=await p.evaluate(()=>{ const V=window.NN_STEP3D.inspect(), ls=V.layers||[]; const laps=ls.filter(L=>L.kind==='sheet'&&L.lo[0][0]<0&&L.lo[0][0]>-.6).map(L=>+L.lo[0][0].toFixed(4));
    const top=ls.length?ls[ls.length-1].path:[]; let spike=0; for(let i=1;i<top.length;i++){ const a=top[i-1], b=top[i]; if(b[1]<a[1]-1e-6&&Math.abs(b[0]-a[0])<1e-6) spike++; }
    return {laps, bad:top.filter(p=>p[0]<-.781||p[1]<-1e-6).length, spike, n:ls.length}; });
  ok(nm+' ⑬ 張り掛けの端が同じ位置に積み重なる（増張り＋4層）・表面が壁や床へ潜らない・折り返し無し', t13.laps.length===5&&t13.laps.every(z=>Math.abs(z-t13.laps[0])<1e-3)&&!t13.bad&&!t13.spike&&t13.n>=18, t13);
  /* ⑭（§640）Shift＋ドラッグ＝平行移動（向きは変わらず、的が動く）。ふつうのドラッグ＝回転 */
  /* ★起点は左 1/4・高さ 30%：保護コンのつまみ（§651）は既定の向きで画面の中央を通り、スマホは⑪の「真上」のままなので中央の縦線になる。
     つまみから引くと回転ではなく切れ目を動かす（正しい動き）ので、つまみから離れた所から引く */
  const t14=await p.evaluate(()=>{ const V=window.NN_STEP3D.inspect(), c=V.canvas, r=c.getBoundingClientRect(), x=r.left+r.width*0.25, y=r.top+r.height*0.3; const th0=V.theta, tg0=V.target.toArray();
    const ev=(t,px,py,o)=>c.dispatchEvent(new PointerEvent(t,Object.assign({bubbles:true,cancelable:true,pointerId:5,pointerType:'mouse',button:0,buttons:1,clientX:px,clientY:py,isPrimary:true},o||{})));
    ev('pointerdown',x,y,{shiftKey:true}); ev('pointermove',x+40,y,{shiftKey:true}); ev('pointerup',x+40,y,{shiftKey:true}); const th1=V.theta, moved=Math.hypot(...V.target.toArray().map((v,i)=>v-tg0[i]));
    ev('pointerdown',x,y); ev('pointermove',x+40,y); ev('pointerup',x+40,y); return {dth_pan:+(th1-th0).toFixed(4), moved:+moved.toFixed(4), dth_rot:+(V.theta-th1).toFixed(3)}; });
  ok(nm+' ⑭ Shift＋ドラッグで向きを変えずに移動・ふつうのドラッグで回る', t14.dth_pan===0&&t14.moved>0.01&&Math.abs(t14.dth_rot+0.24)<0.02, t14);
  /* ⑮（§641）全画面の施工工程表：右側に出る（全体＋全工程の行）・行を押すとその工程へ・見出しをつまんで移動・右下の角で大きさ・✕で閉じ「工程表」で出る */
  /* スマホは既定で閉じている（§641）ので「工程表」で出してから測る。スマホの表は下側に横幅いっぱい（左 24px・最大幅）なので、
     動かす量は枠の中に収まる向き（左へ 20・上へ 100／小さく 50×40）にする。PC は左へ 200・下へ 100／大きく 80×60 */
  const MV=mob?[-20,-100]:[-200,100], RS=mob?[-50,-40]:[80,60];
  const t15=await p.evaluate(async([MV,RS])=>{ document.querySelector('#st3d [data-nav=big]').click(); await new Promise(r=>setTimeout(r,500)); const d=document.querySelector('dialog.s3big'), tb=d&&d.querySelector('.s3tbl'); if(!tb) return {tb:false};
    const opened=tb.hidden; if(tb.hidden) d.querySelector('[data-tbl]').click();
    const sp=window.NN_STEP3D.inspect().cur.sp, rows=tb.querySelectorAll('tr[data-k]').length; tb.querySelector('tr[data-k="3"]').click(); await new Promise(r=>setTimeout(r,150));
    const lab=d.querySelector('.stlab').textContent, onk=(tb.querySelector('tr.on')||{dataset:{}}).dataset.k; const main=d.querySelector('.s3main'), z=main.getBoundingClientRect().width/main.offsetWidth, r0=tb.getBoundingClientRect();
    const ev=(el,t,x,y)=>el.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,pointerId:9,pointerType:'mouse',button:0,buttons:1,clientX:x,clientY:y,isPrimary:true}));
    const h=tb.querySelector('.s3tblh'), hx=r0.left+60, hy=r0.top+10; ev(h,'pointerdown',hx,hy); ev(h,'pointermove',hx+MV[0]*z,hy+MV[1]*z); ev(h,'pointerup',hx+MV[0]*z,hy+MV[1]*z); await new Promise(r=>setTimeout(r,80)); const r1=tb.getBoundingClientRect();
    const g=tb.querySelector('.s3tblg'), gr=g.getBoundingClientRect(); ev(g,'pointerdown',gr.left+10,gr.top+10); ev(g,'pointermove',gr.left+10+RS[0]*z,gr.top+10+RS[1]*z); ev(g,'pointerup',gr.left+10+RS[0]*z,gr.top+10+RS[1]*z); await new Promise(r=>setTimeout(r,80)); const r2=tb.getBoundingClientRect();
    tb.querySelector('[data-tclose]').click(); const hid=tb.hidden; d.querySelector('[data-tbl]').click(); const shown=!tb.hidden; const rightOf=r0.left>main.getBoundingClientRect().width*0.5*z;
    d.querySelector('[data-close]').click(); await new Promise(r=>setTimeout(r,300));
    return {tb:true, opened, rows, n:sp.steps.length, lab, onk, moved:[Math.round((r1.left-r0.left)/z),Math.round((r1.top-r0.top)/z)], resized:[Math.round((r2.width-r1.width)/z),Math.round((r2.height-r1.height)/z)], hid, shown, rightOf}; },[MV,RS]);
  ok(nm+' ⑮ 全画面の施工工程表：'+(mob?'最初から開いている（§667）・下側':'右側')+'・全体＋全工程・行で工程へ・移動・大きさ・✕と「工程表」', t15.tb&&t15.opened===false&&t15.rows===t15.n+1&&t15.lab==='工程 4'&&t15.onk==='3'&&(mob||t15.rightOf)&&Math.abs(t15.moved[0]-MV[0])<=2&&Math.abs(t15.moved[1]-MV[1])<=2&&Math.abs(t15.resized[0]-RS[0])<=2&&Math.abs(t15.resized[1]-RS[1])<=2&&t15.hid&&t15.shown, t15);
  /* ⑯（§650）右側の辺（+x）にも立上り＝標準（本人の指示）：右の立上り躯体（x 1.94〜2.06・奥行き全部・高さ .34）と笠木がある・
     完成形で右の立上りの面（x>1.90）に層の上端 y≈.30（奥の立上りと同じ高さ）がある・層は角で出会う（角の近く x>1.80 かつ z<-.68 に層の点がある）。
     直す前の版（右の立上りなし）は wallR が無く★NG */
  const t16=await p.evaluate(()=>{ nnStepSel(-1); const V=window.NN_STEP3D.inspect(), T=V.T; V.scene.updateMatrixWorld(true);
    const base=V.model.children.find(g=>g.userData.k===-1); let wallR=null, capR=null;
    base.traverse(o=>{ if(!o.isMesh) return; const b=new T.Box3().setFromObject(o); const r=v=>+v.toFixed(3);
      if(b.min.x>1.93&&b.min.x<1.95&&b.max.x>2.05&&b.max.z>3.1&&b.max.y>.33&&b.max.y<.35) wallR=[r(b.min.x),r(b.max.x),r(b.min.z),r(b.max.z),r(b.max.y)];
      if(b.min.x>1.91&&b.min.x<1.93&&b.max.x>2.07&&b.max.z>3.1&&b.min.y>.33&&b.max.y>.36) capR=[r(b.min.y),r(b.max.y)]; });
    let topR=-1, topB=-1, corner=0; const v=new T.Vector3();
    V.model.children.forEach(g=>{ if(g.userData.k<0) return; g.traverse(o=>{ if(!o.isMesh||o.material.userData.kind!=='sheet') return; const pa=o.geometry.attributes.position;
      /* 層の頂点は押し出しの両端（手前の端 z=3.14 と角）にしかないので、右の立上りは z>-.5（角の列を外す）で全部拾う */
      for(let i=0;i<pa.count;i++){ v.fromBufferAttribute(pa,i).applyMatrix4(o.matrixWorld); if(v.x>1.90&&v.z>-.5) topR=Math.max(topR,v.y); if(v.z<-.76&&v.x>-1.5&&v.x<1.5) topB=Math.max(topB,v.y); if(v.x>1.80&&v.z<-.68&&v.y>.1) corner++; } }); });
    return {wallR, capR, topR:+topR.toFixed(3), topB:+topB.toFixed(3), corner}; });
  ok(nm+' ⑯ 右側の辺にも立上り：躯体と笠木がある・右の立上りの層の上端は奥と同じ高さ（.30）・層は角で出会う', !!t16.wallR&&!!t16.capR&&Math.abs(t16.topR-.30)<.005&&Math.abs(t16.topB-.30)<.005&&t16.corner>0, t16);
  /* ⑰（§650）伸縮目地の目地材はコンクリートの中だけ（本人「コンクリートのところにある謎の黒いの」＝金網だけの所まで全幅に描いていた黒い棒）：
     保護コンクリートの工程の黒い箱（dark）は全部、コンクリートの箱の x の範囲の中。直す前の版は x0（-.70）から始まる＝★NG */
  const t17=await p.evaluate(()=>{ const V=window.NN_STEP3D.inspect(), T=V.T, sp=V.cur.sp, k=sp.steps.findIndex(s=>/保護コンクリート/.test(s.w)), g=V.groups[k]; if(!g) return {k};
    let cx=1e9, cX=-1e9; const dark=[]; g.traverse(o=>{ if(!o.isMesh) return; const b=new T.Box3().setFromObject(o);
      if(o.material.userData.kind==='concrete'){ cx=Math.min(cx,b.min.x); cX=Math.max(cX,b.max.x); } if(o.material.userData.base===0x252924) dark.push([+b.min.x.toFixed(3),+b.max.x.toFixed(3)]); });
    const bad=dark.filter(([a,b])=>a<cx-1e-3||b>cX+1e-3); return {k, cx:+cx.toFixed(3), cX:+cX.toFixed(3), n:dark.length, bad}; });
  ok(nm+' ⑰ 目地材（黒い棒）はコンクリートの中だけ（金網だけの所に無い）', t17.n>=2&&!t17.bad.length, t17);
  /* ⑱（§651）保護コンの切れ目：オレンジのつまみ（画面に投影した線）を押して 0.25m ぶん横へ引くと、コンクリートの端が 0.25m 動く（回転はしない）・
     金網は切れ目の手前 300mm だけ（層の切り欠きの端より外には出ない）。直す前の版は V.conGrip が無く★NG */
  const t18=await p.evaluate(()=>{ nnStepSel(-1); const V=window.NN_STEP3D.inspect(), T=V.T, c=V.canvas; V.renderer.render(V.scene,V.camera); if(!V.conGrip) return {grip:false};
    const conX=()=>{ const g=V.groups[V.conK]; let mn=1e9, mesh=1e9; g.traverse(o=>{ if(!o.isMesh) return; const b=new T.Box3().setFromObject(o); if(o.material.userData.kind==='concrete') mn=Math.min(mn,b.min.x); if(o.geometry.type==='CylinderGeometry') mesh=Math.min(mesh,b.min.x); }); return {con:+mn.toFixed(3), mesh:+mesh.toFixed(3)}; };
    const s0=conX(), gp=V.conGrip, r=c.getBoundingClientRect(), scr=v=>{ const q=v.project(V.camera); return [r.left+(q.x+1)/2*r.width, r.top+(1-q.y)/2*r.height]; };
    const zm=(gp.z0+gp.z1)/2, a=scr(new T.Vector3(gp.x,gp.y,zm)), b=scr(new T.Vector3(gp.x-.25,gp.y,zm)), th0=V.theta;   /* 0.25m：限界（切り欠きの端）に当てない */
    const ev=(t,x,y)=>c.dispatchEvent(new PointerEvent(t,{bubbles:true,cancelable:true,pointerId:11,pointerType:'mouse',button:0,buttons:1,clientX:x,clientY:y,isPrimary:true}));
    ev('pointerdown',a[0],a[1]); ev('pointermove',(a[0]+b[0])/2,(a[1]+b[1])/2); ev('pointermove',b[0],b[1]); ev('pointerup',b[0],b[1]);
    /* 金網の始まり（検算）：横棒が切れ目のちょうど 300mm 手前から始まる。層の切り欠きの端（lim[0]−.1）より外には出ない */
    const s1=conX(), x0=V.conLim[0]-.1, expMesh=Math.max(x0,s1.con-.3);
    return {grip:true, s0, s1, moved:+(s0.con-s1.con).toFixed(3), dth:+(V.theta-th0).toFixed(3), band:+(s1.con-s1.mesh).toFixed(3), expMesh:+expMesh.toFixed(3), lim:V.conLim}; });
  ok(nm+' ⑱ 保護コンの切れ目：オレンジのつまみを横へ引くと端が動く（回転しない）・金網は切れ目の手前 300mm だけ', t18.grip&&Math.abs(t18.moved-.25)<.03&&t18.dth===0&&Math.abs(t18.s1.mesh-t18.expMesh)<.01, t18);
  ok(nm+' ⑥ pageerror 0', errs.length===0, errs);
  await p.close(); }
 }finally{ await b.close(); }
 console.log(NG?'★NG '+NG+'件':'全部○'); process.exit(NG?1:0); })();
