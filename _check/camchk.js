/* ★2026-08-14m カメラのエッジ描き直し
   ①クリックした場所に打点（PCの倍率がかかっていても）②頂点ドラッグ ③右クリック戻し
   ④スマホの赤い照準 ⑤確定→材料適用まで通し */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:EXE});

  /* ---- パソコン（幅2000＝表示倍率1.25 がかかる状態） ---- */
  {
    const p=await (await b.newContext({viewport:{width:2000,height:1010}})).newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8899/camera.html',{waitUntil:'load'});
    await p.waitForTimeout(1200);
    await p.evaluate(()=>loadSample()); await p.waitForTimeout(800);
    const Z=await p.evaluate(()=>window.nnPZ||1);
    ok('倍率がかかっている状態で検証（1.25）', Z>1.2, String(Z));
    /* 画面上の狙い3点をクリックして、打点がその真下にあるか */
    const spots=[[0.25,0.45],[0.55,0.6],[0.8,0.5]];
    for(const [fx,fy] of spots){
      const t=await p.evaluate(([fx,fy])=>{
        const r=cv.getBoundingClientRect();
        return {x:r.left+r.width*fx, y:r.top+r.height*fy};
      },[fx,fy]);
      await p.mouse.click(t.x,t.y); await p.waitForTimeout(120);
    }
    const err=await p.evaluate(spots=>{
      const r=cv.getBoundingClientRect();
      return pts.map((p2,i)=>{
        /* 打点をスクリーン座標へ戻して、狙いとの差を測る */
        const sx=r.left+p2.x/(cv.width/r.width), sy=r.top+p2.y/(cv.height/r.height);
        const tx=r.left+r.width*spots[i][0], ty=r.top+r.height*spots[i][1];
        return +Math.hypot(sx-tx,sy-ty).toFixed(2);
      });
    },spots);
    console.log('打点誤差(px)', JSON.stringify(err));
    ok('クリックした場所に打点（誤差1px以内）', err.length===3&&err.every(e=>e<=1), JSON.stringify(err));
    /* 頂点ドラッグ */
    const drag=await p.evaluate(()=>{
      const r=cv.getBoundingClientRect(); const k=cv.width/r.width;
      const p0=pts[1];
      return {sx:r.left+p0.x/k, sy:r.top+p0.y/k, k, before:{...p0}};
    });
    await p.mouse.move(drag.sx,drag.sy); await p.mouse.down();
    await p.mouse.move(drag.sx+60,drag.sy-40,{steps:5}); await p.mouse.up();
    await p.waitForTimeout(150);
    const dcheck=await p.evaluate(before=>{
      const d={x:pts[1].x-before.x, y:pts[1].y-before.y};
      const r=cv.getBoundingClientRect(); const k=cv.width/r.width;
      return {dx:+(d.x/k).toFixed(1), dy:+(d.y/k).toFixed(1)};
    },drag.before);
    console.log('ドラッグ移動量(画面px)', JSON.stringify(dcheck));
    ok('頂点をつかんで動かせる（+60,-40）', Math.abs(dcheck.dx-60)<=2&&Math.abs(dcheck.dy+40)<=2, JSON.stringify(dcheck));
    /* 右クリック＝1点戻す */
    const n0=await p.evaluate(()=>pts.length);
    await p.mouse.click(drag.sx+200, drag.sy, {button:'right'}); await p.waitForTimeout(150);
    const n1=await p.evaluate(()=>pts.length);
    ok('右クリックで1点戻る', n1===n0-1, n0+'→'+n1);
    /* 確定 → 材料適用 → レイヤーが乗る */
    const flow=await p.evaluate(async()=>{
      if(pts.length<2)pts.push({x:cv.width*.7,y:cv.height*.55});
      finishEdge(); await new Promise(z=>setTimeout(z,300));
      applyMat(); await new Promise(z=>setTimeout(z,300));
      return {done:edgeDone, layers:layers.length};
    });
    ok('エッジ確定→材料適用まで通る', flow.done===true&&flow.layers>=1, JSON.stringify(flow));
    ok('PC：JSエラーなし', errs.length===0, errs.join(' / ').slice(0,120));
    await p.screenshot({path:'cam_pc.png'});
    await p.close();
  }

  /* ---- スマホ（赤い照準） ---- */
  {
    const ctx2=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await ctx2.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const p=await ctx2.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8899/camera.html',{waitUntil:'load'});
    await p.waitForTimeout(1200);
    await p.evaluate(()=>loadSample()); await p.waitForTimeout(800);
    /* 指を置く→動かす→離す＝照準の位置に打点 */
    const t=await p.evaluate(()=>{const r=cv.getBoundingClientRect();
      return {x:r.left+r.width*0.5, y:r.top+r.height*0.6};});
    const seq=async(x,y)=>{
      await p.touchscreen.tap; /* not used */
    };
    await p.evaluate(async({x,y})=>{
      const fire=(type,cx,cy)=>cv.dispatchEvent(new PointerEvent(type,{pointerId:9,pointerType:'touch',clientX:cx,clientY:cy,bubbles:true,isPrimary:true}));
      fire('pointerdown',x,y);
      await new Promise(z=>setTimeout(z,80));
      fire('pointermove',x+20,y+10);
      await new Promise(z=>setTimeout(z,80));
      window.__aim={...cvAim};
      fire('pointerup',x+20,y+10);
    },t);
    await p.waitForTimeout(200);
    const ph=await p.evaluate(()=>{
      const k=cv.width/cv.getBoundingClientRect().width;
      return {n:pts.length, aimWasSet:!!window.__aim,
        diff:window.__aim?+Math.hypot(pts[0].x-window.__aim.x, pts[0].y-window.__aim.y).toFixed(1):null,
        offset:window.__aim?{dx:+((window.__aim.x)/k).toFixed(0)}:null};
    });
    console.log('スマホ照準', JSON.stringify(ph));
    ok('スマホ：離した位置＝照準の位置に打点', ph.n===1&&ph.diff!==null&&ph.diff<0.5, JSON.stringify(ph));
    ok('スマホ：JSエラーなし', errs.length===0, errs.join(' / ').slice(0,120));
    await p.close();
  }

  console.log('\n'+R.join('\n'));
  await b.close();
})();
