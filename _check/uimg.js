/* ★2026-08-21b 下絵（読み込んだ写真）を選べる・消せるか（§150）
   node _check/uimg.js       … パソコン
   node _check/uimg.js ph    … スマホ（たて）
   前提： python3 -m http.server 8899 --directory <このフォルダ> */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv.includes('ph');
const URL='http://localhost:8899/zumen_sekisan.html';
let ng=0;
const ok=(c,m)=>{ console.log((c?'  ○ ':'  ★NG ')+m); if(!c)ng++; };

/* 小さな写真（青い四角）を下絵として読み込ませる */
const LOAD=`(async()=>{
  const c=document.createElement('canvas'); c.width=400; c.height=300;
  const x=c.getContext('2d'); x.fillStyle='#3a6ea5'; x.fillRect(0,0,400,300);
  x.fillStyle='#fff'; x.fillRect(40,40,120,80);
  uLoadImage(c.toDataURL('image/png'));
  await new Promise(r=>setTimeout(r,600));
  /* ★画面より大きいと✕が画面の外に出てクリックできない。
     ツールバー（方眼の上に重なっている）にも隠れない場所・大きさに置く */
  if(state.underlay){
    const W=cv.width/devicePixelRatio, H=cv.height/devicePixelRatio;
    state.underlay.mPerPx = (W*0.45)*state.scaleM/(uImg.width*cellPx);   /* 画面幅の45% */
    state.underlay.x=px2gx(W*0.15); state.underlay.y=px2gy(H*0.42); draw();
  }
  return !!state.underlay;
})()`;
/* 下絵の画面上の中心（クリックする場所） */
const CENTER=`(()=>{
  const u=state.underlay, r=cv.getBoundingClientRect();
  const w=uImg.width*u.mPerPx/state.scaleM*cellPx, h=uImg.height*u.mPerPx/state.scaleM*cellPx;
  const cx=gx2px(u.x)+w/2, cy=gy2px(u.y)+h/2;
  const rad=(+u.rot||0)*Math.PI/180;
  const bx=cx+(w/2)*Math.cos(rad)+(h/2)*Math.sin(rad);
  const by=cy+(w/2)*Math.sin(rad)-(h/2)*Math.cos(rad);
  const kx=r.width/(cv.width/devicePixelRatio), ky=r.height/(cv.height/devicePixelRatio);
  return {x:r.left+cx*kx, y:r.top+cy*ky, xx:r.left+bx*kx, xy:r.top+by*ky};   /* ✕ボタンの位置 */
})()`;

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await b.newContext(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
                               :{viewport:{width:1600,height:900}});
if(PH) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});
                                    Object.defineProperty(screen,'height',{get:()=>852});});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
let ask=null; p.on('dialog',async d=>{ ask=d.message(); await d.accept(); });
await p.goto(URL); await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});

console.log('== '+(PH?'スマホ':'パソコン')+' ==');
ok(await p.evaluate(LOAD),'下絵を読み込める');

/* ① 選択ツールで写真をタップすると選べる */
await p.evaluate(()=>setTool('sel')); await p.waitForTimeout(200);
let c=await p.evaluate(CENTER);
if(PH) await p.touchscreen.tap(c.x,c.y); else await p.mouse.click(c.x,c.y);
await p.waitForTimeout(400);
ok(await p.evaluate(()=>!!window.nnUSel),'写真をタップすると選べる');
ok(await p.evaluate(()=>document.getElementById('nnUcard').classList.contains('on')),'操作カードが出る');
const cd=await p.evaluate(()=>{const e=document.getElementById('nnUcard').getBoundingClientRect();
  const w=document.getElementById('canvaswrap').getBoundingClientRect();
  return {inside:e.left>=w.left-1&&e.right<=w.right+1&&e.bottom<=w.bottom+1, btns:document.querySelectorAll('#nnUcard button').length};});
ok(cd.inside,'カードが画面の中に収まっている');
ok(cd.btns===5,'ボタンが5つ（動かす・⟲・⟳・削除・✕）  '+cd.btns);
/* ほかの部品と重ならないこと（案内文・📊積算設定ボタン） */
const ov=await p.evaluate(()=>{
  const a=document.getElementById('nnUcard').getBoundingClientRect();
  const hits=[];
  ['hint','nnSideBtn','navShowTab'].forEach(id=>{
    const e=document.getElementById(id); if(!e) return;
    const s=getComputedStyle(e); if(s.display==='none'||s.visibility==='hidden') return;
    const b=e.getBoundingClientRect(); if(!b.width||!b.height) return;
    if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top) hits.push(id);
  });
  return hits;
});
ok(ov.length===0,'ほかの部品と重ならない  '+ov.join(','));

/* ② カードの操作（回す・透明度） */
await p.click('#nnU_rr'); await p.waitForTimeout(150);
ok(await p.evaluate(()=>Math.abs((+state.underlay.rot||0)-1)<1e-6),'⟳で1度まわる');
await p.evaluate(()=>{const el=document.getElementById('nnU_op'); el.value=30; el.dispatchEvent(new Event('input',{bubbles:true}));});
await p.waitForTimeout(150);
ok(await p.evaluate(()=>Math.abs(state.underlay.op-0.3)<1e-6),'透明度が変えられる');

/* ③ 選択をやめられる */
await p.click('#nnU_x'); await p.waitForTimeout(250);
ok(await p.evaluate(()=>!window.nnUSel && !document.getElementById('nnUcard').classList.contains('on')),'✕で選択をやめられる');

/* ④ 画面の✕ボタンで消せる */
if(PH) await p.touchscreen.tap(c.x,c.y); else await p.mouse.click(c.x,c.y);
await p.waitForTimeout(300);
c=await p.evaluate(CENTER); ask=null;
if(PH) await p.touchscreen.tap(c.xx,c.xy); else await p.mouse.click(c.xx,c.xy);
await p.waitForTimeout(400);
ok(/削除しますか/.test(ask||''),'✕で確認が出る  '+(ask||'').slice(0,20));
ok(await p.evaluate(()=>!state.underlay),'✕で写真が消える');

/* ⑤ 🗑削除ボタンで消せる（選んでいるとき） */
await p.evaluate(LOAD); await p.waitForTimeout(300);
c=await p.evaluate(CENTER);
if(PH) await p.touchscreen.tap(c.x,c.y); else await p.mouse.click(c.x,c.y);
await p.waitForTimeout(300);
ask=null; await p.evaluate(()=>smartDelete()); await p.waitForTimeout(300);
ok(await p.evaluate(()=>!state.underlay),'🗑削除で消える（選んでいるとき）');

/* ⑥ 選んでいなくても、ほかに消すものが無ければ🗑削除で消せる */
await p.evaluate(LOAD); await p.waitForTimeout(300);
ask=null; await p.evaluate(()=>smartDelete()); await p.waitForTimeout(300);
ok(/下絵/.test(ask||''),'選んでいなくても🗑削除が下絵をたずねる  '+(ask||'').slice(0,16));
ok(await p.evaluate(()=>!state.underlay),'それで消える');

/* ⑦ Deleteキーで消せる */
await p.evaluate(LOAD); await p.waitForTimeout(300);
c=await p.evaluate(CENTER);
if(PH) await p.touchscreen.tap(c.x,c.y); else await p.mouse.click(c.x,c.y);
await p.waitForTimeout(300);
ask=null; await p.keyboard.press('Delete'); await p.waitForTimeout(300);
ok(await p.evaluate(()=>!state.underlay),'Deleteキーで消える');

/* ⑧ 全削除は部位・役物と一緒に消す */
await p.evaluate(LOAD); await p.waitForTimeout(300);
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();});
await p.waitForTimeout(600);
ask=null; await p.evaluate(()=>clearAll()); await p.waitForTimeout(500);
ok(/下絵/.test(ask||''),'全削除の確認に下絵が入る  '+(ask||'').slice(0,30));
ok(await p.evaluate(()=>!state.underlay && state.polys.length===0),'全削除で部位も下絵も消える');

/* ⑨ 下絵が無いときの全削除は今までどおり */
ask=null; await p.evaluate(()=>clearAll()); await p.waitForTimeout(300);
ok(ask===null,'消すものが無ければ確認は出ない');

/* ⑩ 辺の選択を邪魔しない */
await p.evaluate(()=>{const x=document.getElementById('tl_sample'); if(x)x.click();});
await p.waitForTimeout(600);
const e0=await p.evaluate(()=>{
  const poly=state.polys[0], a=poly.pts[0], bb=poly.pts[1], r=cv.getBoundingClientRect();
  const kx=r.width/(cv.width/devicePixelRatio), ky=r.height/(cv.height/devicePixelRatio);
  return {x:r.left+gx2px((a.x+bb.x)/2)*kx, y:r.top+gy2px((a.y+bb.y)/2)*ky};});
if(PH) await p.touchscreen.tap(e0.x,e0.y); else await p.mouse.click(e0.x,e0.y);
await p.waitForTimeout(300);
ok(await p.evaluate(()=>!!sel),'辺は今までどおり選べる');
ok(errs.length===0,'JSエラーなし  '+errs.slice(0,2).join(' / '));

await p.screenshot({path:'/tmp/uimg_'+(PH?'ph':'pc')+'.png'});
await b.close();
console.log(ng?('★NG '+ng+'件'):'全部○');
process.exit(ng?1:0);
})();
