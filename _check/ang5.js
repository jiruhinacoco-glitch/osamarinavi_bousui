/* ★2026-08-08c 角度5度きざみ・長さ10cmきざみの確認 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const A=(p1,p2)=>{const d=Math.atan2(p2.y-p1.y,p2.x-p1.x)*180/Math.PI; return (d+360)%360;};

(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.waitForTimeout(1300);

  /* ① 角度が必ず5の倍数・長さが必ず0.1mの倍数になるか（あらゆる狙いで） */
  const sweep=await p.evaluate(()=>{
    tool='draw';
    const bad=[], seen={};
    for(let k=0;k<720;k++){
      const th=k*0.5*Math.PI/180, r=1+ (k%37)*0.13;
      drawPts=[{x:-60,y:-60},{x:2.4,y:1.3}];          /* 直前の点は格子の上にない。
                                                         ★2026-08-13m そろえる相手（始点）は遠くへ置く
                                                           ＝ここでは「5度・10cmきざみ」だけを見たいため。
                                                           そろえの動きは align1.js で確かめる。 */
      const prev=drawPts[1];
      const g=nnSnapPt(prev.x+Math.cos(th)*r, prev.y+Math.sin(th)*r);
      const deg=((Math.atan2(g.y-prev.y,g.x-prev.x)*180/Math.PI)+360)%360;
      const lenM=Math.hypot(g.x-prev.x,g.y-prev.y)*state.scaleM;
      const dOK=Math.abs(deg-Math.round(deg/5)*5)<1e-4;          /* 角度は5の倍数 */
      const lOK=Math.abs(lenM-Math.round(lenM*10)/10)<1e-4;       /* 長さは0.1mの倍数 */
      if(!dOK||!lOK) bad.push({deg:+deg.toFixed(4),lenM:+lenM.toFixed(4)});
      seen[Math.round(deg)]=1;
    }
    drawPts=[];
    return {bad:bad.slice(0,4), nbad:bad.length, nang:Object.keys(seen).length};
  });
  console.log(JSON.stringify(sweep));
  ok('どの狙いでも角度が5の倍数・長さが0.1mの倍数', sweep.nbad===0, JSON.stringify(sweep.bad));
  ok('72通りの向きがすべて出せる', sweep.nang===72, sweep.nang+'通り');

  /* ② 90度の次が135度に飛ばない（間の 95〜130度も出せる） */
  const mid=await p.evaluate(()=>{
    tool='draw';
    const got=[];
    [95,100,105,110,115,120,125,130].forEach(d=>{
      drawPts=[{x:-60,y:-60},{x:2.4,y:1.3}];
      const pv=drawPts[1], t=d*Math.PI/180;
      const g=nnSnapPt(pv.x+Math.cos(t)*3.1, pv.y+Math.sin(t)*3.1);
      got.push(Math.round(((Math.atan2(g.y-pv.y,g.x-pv.x)*180/Math.PI)+360)%360));
    });
    drawPts=[];
    return got;
  });
  console.log('95〜130度:',JSON.stringify(mid));
  ok('90度と135度のあいだの角度も引ける', JSON.stringify(mid)==='[95,100,105,110,115,120,125,130]', JSON.stringify(mid));

  /* ③ 真下・真横は今までどおり完全に引ける（前回の修正の回帰） */
  const cross=await p.evaluate(()=>{
    tool='draw';
    const o={};
    drawPts=[{x:0,y:0},{x:2.4,y:1}]; o.down=nnSnapPt(2.42,4.10);
    drawPts=[{x:0,y:0},{x:2.4,y:1}]; o.up  =nnSnapPt(2.38,-2.10);
    drawPts=[{x:0,y:0},{x:1,y:2.3}]; o.side=nnSnapPt(5.10,2.34);
    drawPts=[];
    return o;
  });
  console.log(JSON.stringify(cross));
  ok('真下：x が直前の点にそろう', Math.abs(cross.down.x-2.4)<1e-9, JSON.stringify(cross.down));
  ok('真上：x が直前の点にそろう', Math.abs(cross.up.x-2.4)<1e-9, JSON.stringify(cross.up));
  ok('真横：y が直前の点にそろう', Math.abs(cross.side.y-2.3)<1e-9, JSON.stringify(cross.side));

  /* ④ 1点目は今までどおり方眼の交差点 */
  const first=await p.evaluate(()=>{ tool='draw'; drawPts=[]; return nnSnapPt(3.42,5.61); });
  ok('1点目は方眼の交差点', first.x===3&&first.y===6, JSON.stringify(first));

  /* ⑤ 交差点をクリックして描く長方形は今までどおりピタリ */
  await p.evaluate(()=>{ drawPts=[]; state.polys=[]; state.active=-1; draw(); });
  /* ★方眼の交差点そのものを画面座標に直してクリックする
     （画面上の適当な位置をクリックすると、1点目が交差点へ移動したぶんだけ
       2点目以降の狙いがズレる。ユーザーは打たれた点を見て狙うのでズレない） */
  const at=async(gx,gy)=>{
    const c=await p.evaluate(({gx,gy})=>{
      const r=cv.getBoundingClientRect();
      const kx=r.width?(cv.width/devicePixelRatio)/r.width:1;
      const ky=r.height?(cv.height/devicePixelRatio)/r.height:1;
      return {x:r.left+(ox+gx*cellPx)/kx, y:r.top+(oy+gy*cellPx)/ky};
    },{gx,gy});
    await p.mouse.click(c.x,c.y); await p.waitForTimeout(140);
  };
  for(const [gx,gy] of [[7,6],[11,6],[11,9],[7,9],[7,6]]) await at(gx,gy);
  await p.waitForTimeout(300);
  const t=await p.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
  ok('方眼どおりの長方形が作れる', /作成しました/.test(t), t);
  const rc=await p.evaluate(()=>{
    const q=state.polys[state.polys.length-1]; if(!q)return null;
    return q.pts.map(v=>[+v.x.toFixed(6),+v.y.toFixed(6)]);
  });
  const intOK=rc && rc.every(([x,y])=>Number.isInteger(x)&&Number.isInteger(y));
  ok('長方形の頂点は交差点ぴったり', intOK, JSON.stringify(rc));

  /* ⑥ 斜めの角度もそのまま作図できる（例：25度） */
  await p.evaluate(()=>{ drawPts=[]; state.active=-1; draw(); const btn=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('描画')); if(btn)btn.click(); });
  const tri=await p.evaluate(()=>{
    tool='draw'; drawPts=[{x:4,y:4}];
    const t=25*Math.PI/180;
    const g=nnSnapPt(4+Math.cos(t)*6, 4+Math.sin(t)*6);
    drawPts.push(g);
    const d=((Math.atan2(g.y-4,g.x-4)*180/Math.PI)+360)%360;
    const L=Math.hypot(g.x-4,g.y-4)*state.scaleM;
    drawPts=[];
    return {d:+d.toFixed(3), L:+L.toFixed(3)};
  });
  console.log('25度ねらい:',JSON.stringify(tri));
  ok('斜め（25度）もそのまま引ける', Math.abs(tri.d-25)<1e-6, JSON.stringify(tri));

  ok('JSエラーなし', errs.length===0, errs[0]||'');
  console.log(R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'★ NG あり':'すべて○');
  await b.close();
})();
