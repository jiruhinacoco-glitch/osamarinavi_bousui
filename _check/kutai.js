/* ★2026-09-09c §367 置いた増し張り（貼り物）が **躯体を貫通していないか**
   本人の指示「具体（躯体）を貫通させる概念を無くして。今後実装する機械固定とかに
   使うアンカーやビス以外は貫通を禁止する」。

   ★検算に製品の関数（wallPath / nnSheetPathWorld など）は使わない。
     この検査は建物を自分で作っているので、**断面を手で書き下した式**で
     「そこは躯体（＋防水層）の中か、何m入り込んでいるか」を出して突き合わせる。

     屋根 10m×8m ／ パラペット 高さ300mm・厚さ250mm・面取り20mm ／ 防水層12mm
       ・平場   ：y < 0.012 は中
       ・立上り ：辺の線から内側へ t < 0.256 かつ y < 0.312 は中
                  （天端内側の面取りは t+y <= 0.547 で切る）
   使い方: node _check/kutai.js  ／ node _check/kutai.js _before.html */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const RX=10, RZ=8;                                   /* 屋根の大きさ(m) */
const TH=0.25, HH=0.30, MEM=0.012, FO=TH+0.006, CH=0.02;
/* 点が「躯体＋防水層」の中へ何m入り込んでいるか（＋なら中） */
function depth(x,y,z){
  /* ★屋根の外は空。中なら「境界からいちばん近い距離 tin」で断面を見る
     （辺ごとに見ると、辺の端より先まで壁があることにしてしまう） */
  const tin=Math.min(x, RX-x, z, RZ-z);
  let d=-9;
  if(tin>FO) d=Math.max(d, Math.min(MEM-y, tin-FO));                 /* 平場（防水層の中） */
  d=Math.max(d, Math.min(HH+MEM-y, FO-tin, tin+MEM,
      (0.53+MEM*Math.SQRT2-(tin+y))/Math.SQRT2));                    /* 立上り＋天端（面取りで切る） */
  return d;
}
(async()=>{
  /* ★測り方そのものの確かめ（分かっている点） */
  const sane=[['壁の中',9.9,0.15,4,true],['天端の中',9.9,0.25,4,true],
    ['平場の防水層の上',5,0.024,4,false],['立上りに貼った点',9.732,0.15,4,false],
    ['天端に貼った点',9.9,0.324,4,false],['空中',5,2,4,false]];
  sane.forEach(s=>ok((depth(s[1],s[2],s[3])>0.02)===s[4], '測り方 '+s[0], +depth(s[1],s[2],s[3]).toFixed(3)));

  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:420,height:900},isMobile:true,hasTouch:true,deviceScaleFactor:2});
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
  await p.waitForFunction(()=>{try{return !!T.renderer.domElement._nnFaceDrag;}catch(_){return false;}},{timeout:9000});
  const settle=async()=>{ await p.waitForFunction(()=>{ try{ const el=T.renderer.domElement;
      const k=[T.camera.position.x,T.camera.position.y,T.camera.position.z,el.clientWidth,el.clientHeight].map(v=>Math.round(v*100)).join(',');
      window.__n=(window.__p===k)?(window.__n||0)+1:0; window.__p=k; return (window.__n||0)>=5; }catch(_){return false;} },{timeout:18000}).catch(()=>{}); await p.waitForTimeout(150); };
  const cam=async(o)=>{ await p.evaluate(o=>{ Object.assign(T,o); T.rev=(T.rev|0)+1; },o); await p.waitForTimeout(900); await settle(); };
  const SCR=async(c)=>{ await settle(); return p.evaluate(c=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(c[0],c[1],c[2]).project(T.camera);
      const s={x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height};
      const t=(window.nnD3AimFinger?nnD3AimFinger(s.x,s.y):{x:s.x-36,y:s.y+52}); const e=document.elementFromPoint(t.x,t.y);
      return {t:[t.x,t.y], ok: t.x>r.left+4&&t.x<r.right-4&&t.y>r.top+4&&t.y<r.bottom-4 && e && e.tagName==='CANVAS'}; },c); };
  const draw=async(pts)=>{
    await p.evaluate(()=>{ state.d3sheet=[]; try{nnD3DrawCancel&&nnD3DrawCancel();}catch(_){}
      nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
    await p.waitForTimeout(600);
    let miss=0;
    for(const c of pts){ const s=await SCR(c); if(!s.ok){ miss++; continue; }
      await p.touchscreen.tap(s.t[0],s.t[1]); await p.waitForTimeout(430); }
    const s0=await SCR(pts[0]); if(s0.ok){ await p.touchscreen.tap(s0.t[0],s0.t[1]); await p.waitForTimeout(1600); }
    /* 貼り物のメッシュの頂点を **世界の座標** で取り出す（三角形の重心も足す） */
    const vs=await p.evaluate(()=>{
      const out=[];
      T.scene.traverse(o=>{ if(!o.isMesh||o.name!=='nnSheet') return;
        o.updateMatrixWorld(true);
        const g=o.geometry, pos=g.attributes&&g.attributes.position; if(!pos) return;
        const v=new THREE.Vector3(), a=new THREE.Vector3(), b2=new THREE.Vector3(), c2=new THREE.Vector3();
        for(let i=0;i<pos.count;i++){ v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);
          out.push([v.x,v.y,v.z]); }
        const idx=g.index;
        const n=idx?idx.count:pos.count;
        for(let i=0;i+2<n;i+=3){
          const i0=idx?idx.getX(i):i, i1=idx?idx.getX(i+1):i+1, i2=idx?idx.getX(i+2):i+2;
          a.fromBufferAttribute(pos,i0).applyMatrix4(o.matrixWorld);
          b2.fromBufferAttribute(pos,i1).applyMatrix4(o.matrixWorld);
          c2.fromBufferAttribute(pos,i2).applyMatrix4(o.matrixWorld);
          out.push([(a.x+b2.x+c2.x)/3,(a.y+b2.y+c2.y)/3,(a.z+b2.z+c2.z)/3]);
          for(const t of [[a,b2],[b2,c2],[c2,a]]) for(let k=1;k<4;k++){ const u=k/4;
            out.push([t[0].x+(t[1].x-t[0].x)*u, t[0].y+(t[1].y-t[0].y)*u, t[0].z+(t[1].z-t[0].z)*u]); }
        }
      });
      const s=state.d3sheet[0];
      return {vs:out, n:s?s.faces.length:0, area:s?+s.faces.reduce((x,f)=>x+(+f.am||0),0).toFixed(3):0};
    });
    let bad=0, worst=null, wd=0;
    vs.vs.forEach(v=>{ const d=depth(v[0],v[1],v[2]);
      if(d>0.02){ bad++; if(d>wd){ wd=d; worst=[+v[0].toFixed(2),+v[1].toFixed(3),+v[2].toFixed(2),+d.toFixed(3)]; } } });
    return {miss, tot:vs.vs.length, bad, worst, n:vs.n, area:vs.area};
  };

  /* ① ふつうの増張り（平場→立上り）＝貫通しないのが当たり前 */
  await cam({theta:Math.PI*0.42, phi:0.85, tx:6, tz:1.0, r:5.0});
  const A=await draw([[5.0,0.024,0.55],[7.0,0.024,0.55],[7.0,0.20,0.268],[5.0,0.20,0.268]]);
  console.log('  ① '+JSON.stringify(A));
  ok(A.miss===0, '① 4点とも置ける', A.miss);
  ok(A.n>0, '① ちゃんと貼れている（貼れていなければ検査にならない）', A.n);
  ok(A.bad===0, '① 躯体の中に入った点がない', A.worst||A.bad);

  /* ② 角をまたぐ（本人のスクショの形）＝ここが崩れていた */
  await cam({theta:Math.PI*1.28, phi:0.62, tx:9.0, tz:7.0, r:3.6});
  const B=await draw([[9.0,0.024,6.7],[9.4,0.024,7.4],[9.0,0.15,7.732],[8.6,0.15,7.732]]);
  console.log('  ② '+JSON.stringify(B));
  ok(B.miss===0, '② 4点とも置ける', B.miss);
  ok(B.n>0, '② ちゃんと貼れている', B.n);
  ok(B.bad===0, '② 角をまたいでも躯体の中に入らない', B.worst||B.bad);

  /* ③ 天端をまたぐ（立上り→天端） */
  await cam({theta:Math.PI*0.42, phi:1.05, tx:5.6, tz:0.9, r:4.2});
  const C=await draw([[5.0,0.20,0.268],[6.2,0.20,0.268],[6.2,0.324,0.10],[5.0,0.324,0.10]]);
  console.log('  ③ '+JSON.stringify(C));
  ok(C.miss===0, '③ 4点とも置ける', C.miss);
  ok(C.n>0, '③ ちゃんと貼れている', C.n);
  ok(C.bad===0, '③ 天端をまたいでも躯体の中に入らない', C.worst||C.bad);


  /* ④ 角をまたぐ形・立上りの下の平場（プログラムから直に貼る＝カメラに左右されない）
        ★直す前の版では、④-1が最大46mm、④-2が最大112mm 躯体に食い込む */
  const setup=await p.evaluate(()=>{
    const P=nnSheetPathAt(new THREE.Vector3(5,0.15,0.256), new THREE.Vector3(0,0,1));
    if(!P) return null; window.__P=P;
    return {deck:nnSheetPathUS(P,new THREE.Vector3(5,0.012,1.0))[1],
            wall:nnSheetPathUS(P,new THREE.Vector3(5,0.15,0.256))[1],
            top: nnSheetPathUS(P,new THREE.Vector3(5,0.312,0.10))[1]};
  });
  ok(!!setup, '④ 辺の道が取れる');
  if(setup){
    const put=async(u,s0,s1)=>{
      await p.evaluate(a=>{ state.d3sheet=[];
        window.nnSheetMode={mat:{n:'増し張り材',col:'#3f3b36',src:'t'},kind:'poly',w:400,d:200,t:4};
        const f=nnSheetPathFace(window.__P, [[a.u[0],a.s[0]],[a.u[1],a.s[0]],[a.u[1],a.s[1]],[a.u[0],a.s[1]]]);
        if(f) nnSheetCommit(f);
        try{ dirty3d=true; build3D(); }catch(_){}      /* 貼らなかったときも描き直す（前の板を残さない） */
      }, {u, s:[s0,s1]});
      await p.waitForTimeout(400);
      return p.evaluate(()=>{ const vs=[];
        T.scene.traverse(o=>{ if(!o.isMesh||o.name!=='nnSheet') return;
          o.updateMatrixWorld(true);
          const g=o.geometry, pos=g.attributes&&g.attributes.position; if(!pos) return;
          const v=new THREE.Vector3();
          for(let i=0;i<pos.count;i++){ v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld); vs.push([v.x,v.y,v.z]); } });
        return {vs, n:(state.d3sheet&&state.d3sheet[0])?state.d3sheet[0].faces.length:0}; });
    };
    const judge=(r)=>{ let bad=0, wd=0, w=null;
      r.vs.forEach(v=>{ const d=depth(v[0],v[1],v[2]);
        if(d>0.02){ bad++; if(d>wd){ wd=d; w=[+v[0].toFixed(2),+v[1].toFixed(3),+v[2].toFixed(2),+d.toFixed(3)]; } } });
      return {bad, tot:r.vs.length, worst:w, n:r.n}; };

    /* ④-1 角をまたぐ（立上り→面取り→天端）。留め継ぎは段ごとに折れている */
    const D=judge(await put([8.5,10.5], setup.wall, setup.top));
    console.log('  ④-1 '+JSON.stringify(D));
    ok(D.n>=4, '④-1 角をまたいで2つの壁に貼れている', D.n);
    ok(D.bad===0, '④-1 角の躯体に食い込まない（面取りの留め継ぎ）', D.worst||D.bad);

    /* ④-2 立上りの下の平場（そこには貼る面が無い）＝1枚も貼らないのが正しい */
    const E=judge(await put([9.9,10.1], setup.deck, setup.deck+0.25));
    console.log('  ④-2 '+JSON.stringify(E));
    ok(E.n===0, '④-2 立上りの下には貼らない（0面）', E.n);
    ok(E.bad===0, '④-2 躯体の中に板ができない', E.worst||E.bad);
  }

  ok(errs.length===0, 'JSエラーなし', errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 貼り物は躯体を貫通していない');
  await b.close();
})();
