/* 下地（構造体）5種の選択と表現（2026-08-18h） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(2600); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});

  /* ① 5種そろっている・設定パネルと断面バーの両方に出る */
  const r1=await p.evaluate(()=>({list:NN_KOUZOU.map(x=>x.k), names:NN_KOUZOU.map(x=>x.n),
    sels:document.querySelectorAll('.nnKzSel').length, panel:!!document.getElementById('nnKzPanel'),
    def:state.kouzou||'rc'}));
  ok('下地6種（RC/S造/S+ALC/SRC/W/S+デッキ）', r1.list.join(',')==='rc,s,salc,src,w,sdeck', r1.list);
  ok('積算・設定と断面バーの両方から選べる', r1.panel&&r1.sels>=2, r1.sels);

  /* ② 断面を描く → 下地ごとにハッチが変わる（画素で確かめる） */
  await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(900);
  const box=await p.evaluate(()=>{const r=document.getElementById('sdCv').getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height};});
  const tap=async(fx,fy)=>{ await p.touchscreen.tap(box.x+box.w*fx, box.y+box.h*fy); await p.waitForTimeout(170); };
  await tap(0.30,0.72); await tap(0.62,0.72); await tap(0.62,0.42); await tap(0.30,0.42);
  const st=await p.evaluate(()=>{const s=state.sect,q=nnSdXY(s.pts[0].x,s.pts[0].y),r=document.getElementById('sdCv').getBoundingClientRect(); return {x:r.x+q.x-36,y:r.y+q.y+52};});
  await p.touchscreen.tap(st.x,st.y); await p.waitForTimeout(350);
  ok('断面を閉じた', await p.evaluate(()=>state.sect.closed)===true);

  const sig=async k=>{ await p.evaluate(v=>nnKouzouSet(v), k); await p.waitForTimeout(400);
    return await p.evaluate(()=>{ const cv=document.getElementById('sdCv'), c=cv.getContext('2d');
      const d=c.getImageData(0,0,cv.width,cv.height).data; let h=0;
      for(let i=0;i<d.length;i+=40){ h=(h*31 + d[i] + d[i+1]*3)|0; }
      return h; }); };
  const sigs={};
  for(const k of ['rc','s','salc','src','w','sdeck']){ sigs[k]=await sig(k);
    await p.screenshot({path:'out/chk_kz_'+k+'.png'}); }
  const uniq=new Set(Object.values(sigs)).size;
  ok('6種とも断面のハッチが違う（描き分けている）', uniq===6, sigs);

  /* ③ 3D：材質が下地ごとに変わる・デッキ/木/ALCは構造の形も足される */
  const mesh={};
  for(const k of ['rc','s','salc','w','sdeck']){
    await p.evaluate(v=>nnKouzouSet(v), k);
    await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(300);
    await p.evaluate(()=>nnSec3D()); await p.waitForTimeout(k==='rc'?3500:1600);
    mesh[k]=await p.evaluate(()=>{ let extra=0, col=null, tex=false;
      T.group.traverse(o=>{ if(o.isMesh){ if(o.name==='nnKouzou')extra++;
        else if(!o.name){ col=o.material.color.getHexString(); tex=!!o.material.map; } }});
      return {extra, col, tex}; });
    await p.screenshot({path:'out/chk_kz3d_'+k+'.png'});
  }
  ok('RCは形を足さない（質感だけ）', mesh.rc.extra===0, mesh.rc);
  ok('S＋ルーフデッキは波形の鋼板が付く', mesh.sdeck.extra>=1, mesh.sdeck);
  ok('W（木造）は垂木が付く', mesh.w.extra>=1, mesh.w);
  ok('S＋ALCはパネルの目地が付く', mesh.salc.extra>=1, mesh.salc);
  ok('躯体の色が下地ごとに変わる', new Set(['rc','salc','w','sdeck'].map(k=>mesh[k].col)).size>=3,
     {rc:mesh.rc.col, salc:mesh.salc.col, w:mesh.w.col, sdeck:mesh.sdeck.col});
  ok('質感（模様）が貼られている', ['rc','salc','w','sdeck'].every(k=>mesh[k].tex));

  /* ④ PDF：下地の名前とパターンが入る */
  await p.evaluate(()=>nnKouzouSet('sdeck'));
  await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(500);
  const [pop]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(()=>document.getElementById('sec_pdf').click())]);
  await pop.waitForLoadState('domcontentloaded'); await pop.waitForTimeout(700);
  const doc=await pop.evaluate(()=>({txt:document.body.textContent,
    kz:!!document.querySelector('pattern#kz'), fill:(document.querySelector('svg path')||{}).getAttribute?document.querySelectorAll('svg path')[0].getAttribute('fill'):''}));
  ok('PDFに下地の名前とハッチが入る', /下地：S＋ルーフデッキ/.test(doc.txt)&&doc.kz&&doc.fill==='url(#kz)', {kz:doc.kz, fill:doc.fill});
  await pop.close();

  /* ⑤ 保存される */
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(2500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  ok('選んだ下地は保存される', await p.evaluate(()=>state.kouzou)==='sdeck');
  ok('選択欄にも反映される', await p.evaluate(()=>document.querySelector('.nnKzSel').value)==='sdeck');

  /* ⑥ 図面（平面）の3Dにも効く */
  await p.evaluate(()=>{ const b=document.getElementById('tl_sample'); if(b)b.click(); }); await p.waitForTimeout(900);
  await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(3000);
  const plan=await p.evaluate(()=>{ let woodish=0, n=0;
    T.group.traverse(o=>{ if(o.isMesh&&o.material&&o.material.color){ n++;
      const h=o.material.color.getHexString(); if(h==='bcc3c8')woodish++; }});
    return {n, hit:woodish}; });
  ok('図面の3Dの躯体も下地の色になる', plan.hit>0, plan);
  ok('JSエラーなし', errs.length===0, errs);
  console.log(R.join('\n'));
  await b.close();
})();
