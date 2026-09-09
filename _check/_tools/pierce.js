/* 線が躯体を貫通していないか。予告線の実際の頂点を取り出して、躯体の中を通っていないか調べる */
const FILE=process.argv[2]||'zumen_sekisan.html';
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:900,height:420},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>420});Object.defineProperty(screen,'height',{get:()=>900});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE,{waitUntil:'load'});
  await p.waitForTimeout(1800); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1; const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
    state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:25000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} });
  await p.waitForTimeout(1500);
  await p.addStyleTag({content:'#d3pad,#nnQuickPad,#nnCondBar,#nnSkyBar,#nnAxisBar,#nnAxisGiz,#nnD3Card,#toolbar,#nnQuickBar,#nnStageBar,#nnSideBtn,#nnTbFold,#nnPerpBtn,#navShowTab,#toast{display:none!important}'});
  await p.evaluate(()=>{ Object.assign(T,{theta:Math.PI*1.25, phi:1.30, tx:9.0, tz:7.0, r:3.4}); T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(1400);
  const SCR=async(c)=>p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      return {x:r.left+(q.x*0.5+0.5)*r.width, y:r.top+(-q.y*0.5+0.5)*r.height}; },c);
  const FING=async(s)=>p.evaluate(s=>(window.nnD3AimFinger?nnD3AimFinger(s.x,s.y):{x:s.x-36,y:s.y+52}), s);
  const TOUCH=`(t,id,x,y)=>{const el=T.renderer.domElement;
    el.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,bubbles:true,cancelable:true}));}`;
  await p.evaluate(()=>{ nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'poly'); });
  await p.waitForTimeout(500);
  /* 1点目＝平場（壁から1m内側） */
  const s1=await SCR([9.0,0.012,6.7]); const f1=await FING(s1);
  await p.touchscreen.tap(f1.x,f1.y); await p.waitForTimeout(500);
  console.log('1点目:',JSON.stringify(await p.evaluate(()=>nnD3DrawWs())));
  /* 狙い＝天端の上（パラペットの上）＝直線ならパラペットを貫通する */
  for(const tgt of [[9.0,0.312,7.87],[9.0,0.15,7.738],[9.0,0.312,7.62]]){
    const s=await SCR(tgt); const f=await FING(s);
    await p.evaluate(`(${TOUCH})('pointerdown',61,${f.x},${f.y})`); await p.waitForTimeout(80);
    await p.evaluate(`(${TOUCH})('pointermove',61,${f.x},${f.y})`); await p.waitForTimeout(220);
    const r=await p.evaluate(()=>{
      /* 予告線の頂点を取り出す */
      let pts=null;
      T.scene.traverse(o=>{ let par=o,hit=false;
        while(par){ if(par.name==='nnPvLine2'||par.name==='nnPvLine'){hit=true;break;} par=par.parent; }
        if(!hit||!o.isLine) return;
        if(o.geometry&&o.geometry.attributes&&o.geometry.attributes.position){
          const a=o.geometry.attributes.position.array, out=[];
          for(let i=0;i<a.length;i+=3) out.push([+a[i].toFixed(3),+a[i+1].toFixed(3),+a[i+2].toFixed(3)]);
          if(out.length) pts=(pts||[]).concat(out); } });
      /* ★モデルを使わず、カメラから光線を撃って「その点が躯体の裏に隠れていないか」で見る。
         線が面の上を走っていれば、光線の最初の当たりはその点のすぐ手前。
         躯体を突き抜けていれば、点は最初の当たりよりずっと奥にある。 */
      const el=T.renderer.domElement, rc0=el.getBoundingClientRect();
      const rcast=new THREE.Raycaster();
      const tgs=[T.group];
      const deep=(x,y,z)=>{
        const P=new THREE.Vector3(x,y,z);
        const dir=new THREE.Vector3().subVectors(P,T.camera.position);
        const L=dir.length(); dir.normalize();
        rcast.set(T.camera.position, dir);
        const hs=rcast.intersectObjects(tgs,true)||[];
        for(let i2=0;i2<hs.length;i2++){ const o=hs[i2].object;
          if(o.userData&&o.userData.pick) continue;
          if(o.material&&o.material.transparent&&o.material.opacity<0.1) continue;
          if(o.name==='nnSolLab') continue;
          return L-hs[i2].distance;                 /* +なら点は当たりより奥＝隠れている */
        }
        return -99; };
      let bad=0, tot=0, worst=null, wd=0;
      if(pts){ for(let i=0;i+1<pts.length;i+=2){
        for(let k=1;k<16;k++){ const t=k/16;
          const x=pts[i][0]+(pts[i+1][0]-pts[i][0])*t, y=pts[i][1]+(pts[i+1][1]-pts[i][1])*t, z=pts[i][2]+(pts[i+1][2]-pts[i][2])*t;
          tot++; const d=deep(x,y,z);
          if(d>0.04){ bad++; if(d>wd){ wd=d; worst=[+x.toFixed(2),+y.toFixed(2),+z.toFixed(2),+d.toFixed(2)]; } } } } }
      return {seg:pts?pts.length/2:0, tot, bad, worst, ends:pts?[pts[0],pts[pts.length-1]]:null};
    });
    console.log('狙い'+JSON.stringify(tgt)+' → 線'+r.seg+'本  躯体の裏に隠れている点 '+r.bad+'/'+r.tot+(r.worst?('  例'+JSON.stringify(r.worst)):''));
    await p.evaluate(`(${TOUCH})('pointercancel',61,${f.x},${f.y})`); await p.waitForTimeout(120);
  }
  console.log('errs',errs.slice(0,2));
  await b.close();
})();
