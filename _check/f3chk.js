const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const FAKE3D = () => {
  const noop=function(){};
  const obj=()=>({position:{set(x,y,z){this._p=[x,y,z];},y:0},rotation:{y:0}});
  window.__g=[];
  eval(window.__STUB);   /* ニセTHREE＝scratchpad/stub3.js */
};
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({viewport:{width:1280,height:860}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200);
  await p.evaluate(s=>{window.__STUB=s;}, '('+require('./stub3.js').toString()+')()');
  const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex?'  '+ex:''));
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('サンプル形状')); if(b)b.click(); });
  await p.waitForTimeout(700);

  // ① 継目線が屋根の外に出ないか（凸凹した部位で検査）
  const seam = await p.evaluate((fake)=>{
    eval('('+fake+')()');
    show3dWari=true; dirty3d=true; build3D();
    const g=window.__g[window.__g.length-1];
    /* ★平場の継目だけを見る。パラペットの天端・立上りに回した継目は
         屋根の輪郭の外（壁の上）にあるのが正しいので、高さで除く。 */
    const flatY=state.polys.map(pp=>(pp.lv||0)+0.016);
    const seams=g.children.filter(c=>c.geometry&&c.geometry.kind==='cyl'
      && flatY.some(yy=>Math.abs(c.position._p[1]-yy)<0.005));
    // 各継目線の両端が、その部位の輪郭の中（または縁）にあるか
    const s=state.scaleM;
    const inAny=(x,z)=>state.polys.some(poly=>{
      const pts=poly.pts.map(q=>({x:q.x*s,y:q.y*s}));
      // 点が多角形の中か（縁は許容 0.05m）
      let inside=false;
      for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        if(((pts[i].y>z)!==(pts[j].y>z)) &&
           (x < (pts[j].x-pts[i].x)*(z-pts[i].y)/(pts[j].y-pts[i].y)+pts[i].x)) inside=!inside;
      }
      if(inside)return true;
      // 縁の近く
      for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        const dx=pts[j].x-pts[i].x, dy=pts[j].y-pts[i].y, L2=dx*dx+dy*dy||1;
        let t=((x-pts[i].x)*dx+(z-pts[i].y)*dy)/L2; t=Math.max(0,Math.min(1,t));
        const px=pts[i].x+dx*t, py=pts[i].y+dy*t;
        if(Math.hypot(x-px,z-py)<0.06)return true;
      }
      return false;
    });
    let out=0;
    seams.forEach(c=>{
      const gm=c.geometry, [cx,,cz]=c.position._p, L=gm.len;
      /* ★斜めに寝かせた棒（貼りかけのはみ出しアス）は rotation.y で向きを付けている。
           向きを無視すると x方向の棒として測ってしまい、誤って「外に出た」と出る。 */
      const th2=-(c.rotation.y||0), ux=Math.cos(th2), uz=Math.sin(th2);
      const ends = gm.alongX ? [[cx-L/2*ux,cz-L/2*uz],[cx+L/2*ux,cz+L/2*uz]]
                             : [[cx,cz-L/2],[cx,cz+L/2]];
      ends.forEach(([x,z])=>{ if(!inAny(x,z))out++; });
    });
    return { n:seams.length, out };
  }, FAKE3D.toString());
  ok('①継目線が屋根の外に出ない', seam.out===0, '継目'+seam.n+'本／はみ出し端点 '+seam.out+'個');

  // ② ダークモードのボタンが3か所にある
  const btns = await p.evaluate(()=>({
    tool:!!document.getElementById('tl_night'),   /* ★2026-08-16a 夜画面ボタンに変わった */
    /* ★2026-08-18e 3Dパッドの🌙は削除（上のツールバーの夜/昼に一本化）。パッドには視点2ボタンが入った */
    d3:!!document.getElementById('d3_plan')&&!!document.getElementById('d3_iso')&&!document.getElementById('d3_theme'),
    sec:!!document.getElementById('sec_theme') }));
  ok('②図面/割付のツールバーに切替', btns.tool);
  ok('②3Dパッドは🌙を廃止し視点2ボタンに（夜/昼は上のツールバー）', btns.d3);
  ok('②断面のバーに切替', btns.sec);
  // 3Dの背景がテーマに追従（3Dを開く前に暗くしてから初期化）
  const bg = await p.evaluate((fake)=>{
    nnSetTheme('dark');
    T=null;                       /* まだ3Dを開いていない状態にする */
    eval('('+fake+')()');
    init3D();
    return T&&T.scene&&T.scene.background?T.scene.background.c:null;
  }, FAKE3D.toString());
  ok('②3Dを後から開いても背景が暗い', bg===0x0d161d, '背景 0x'+(bg||0).toString(16));
  await p.evaluate(()=>nnSetTheme('light'));

  // ③ マスの表示・非表示
  const g1 = await p.evaluate(()=>{
    const c=document.getElementById('cv'), x=c.getContext('2d');
    const d=x.getImageData(0,0,c.width,Math.min(c.height,500)).data;
    let grid=0; for(let i=0;i<d.length;i+=4){ if(d[i+2]>d[i]+4 && d[i]>150)grid++; }
    return grid;
  });
  await p.evaluate(()=>nnSetGrid(false)); await p.waitForTimeout(400);
  const g2 = await p.evaluate(()=>{
    const c=document.getElementById('cv'), x=c.getContext('2d');
    const d=x.getImageData(0,0,c.width,Math.min(c.height,500)).data;
    let grid=0; for(let i=0;i<d.length;i+=4){ if(d[i+2]>d[i]+4 && d[i]>150)grid++; }
    return grid;
  });
  ok('③マスを消すと方眼が消える', g2 < g1*0.15, '水色の画素 '+g1+' → '+g2);
  /* ★2026-08-16b 絵の付いたボタンは先頭の絵文字を消す仕様（§118b）。ON/OFFは緑の点灯で見分ける。
     期待値を「点灯が変わる」に更新（product正・テストが古い） */
  ok('③ボタンの点灯が変わる', !(await p.evaluate(()=>document.getElementById('tl_grid').classList.contains('on'))));
  // 打点は交差点のまま（マス非表示でも。5度・0.1mきざみでも交差点は打てる）
  await p.evaluate(()=>{ setTool('draw'); });

  /* ★2026-08-08c 打点は「直前の点から5度きざみ・0.1mきざみ」になったので、
     画面の適当な位置ではなく方眼の交差点そのものをクリックする
     （1点目が交差点へ寄るぶん、素の画面座標だと2点目以降の狙いがズレるため）。 */
  const gclick=async(gx,gy)=>{
    const c=await p.evaluate(({gx,gy})=>{
      const r=cv.getBoundingClientRect();
      const kx=r.width?(cv.width/devicePixelRatio)/r.width:1;
      const ky=r.height?(cv.height/devicePixelRatio)/r.height:1;
      return {x:r.left+(ox+gx*cellPx)/kx, y:r.top+(oy+gy*cellPx)/ky};
    },{gx,gy});
    await p.mouse.click(c.x,c.y); await p.waitForTimeout(150);
  };
  for(const [gx,gy] of [[7,6],[11,6],[11,9]]) await gclick(gx,gy);
  const pts = await p.evaluate(()=>drawPts.map(q=>[q.x,q.y]));
  ok('③マス非表示でも打点は交差点', pts.length===3 && pts.every(([x,y])=>Number.isInteger(x)&&Number.isInteger(y)), JSON.stringify(pts));
  await p.evaluate(()=>{ drawPts=[]; nnSetGrid(true); }); await p.waitForTimeout(300);
  ok('③戻すと方眼が出る', (await p.evaluate(()=>{
    const c=document.getElementById('cv'), x=c.getContext('2d');
    const d=x.getImageData(0,0,c.width,300).data; let grid=0;
    for(let i=0;i<d.length;i+=4){ if(d[i+2]>d[i]+4 && d[i]>150)grid++; }
    return grid; })) > 500);
  // 保存されるか
  await p.evaluate(()=>nnSetGrid(false));
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1200);
  ok('③再読み込みしても覚えている', await p.evaluate(()=>nnGridOn()===false));
  await p.evaluate(()=>nnSetGrid(true));
  await p.screenshot({path:'f3.png'});
  console.log(R.join('\n'));
  console.log(errs.length?'JSエラー:\n'+errs.join('\n'):'JSエラーなし');
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
