/* ★2026-08-28c 隣り合う屋根の境界に「勝手に外壁が発生する」（§231①）
   本人の指摘「1枚目の屋根と2枚目の屋根に何もしないと勝手に壁面が発生する。これは不要」。
   壁当り（kabe）の辺で、隣の部位の躯体がすでにその壁なのに、
   同じ壁をもう1枚（隣の高さまでの外壁）立てていた＝背中合わせの二重壁。
   本人の実際の図面（屋根①54.7㎡・GL+4.0・W造／屋根②101.1㎡・GL+0・RC造）で確かめる。
   使い方: node _check/adjwall.js ／ node _check/adjwall.js before（直す前と比較） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BEFORE=process.argv[2]==='before';
const FILE=BEFORE? '_before.html' : 'zumen_sekisan.html';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  if(BEFORE) require('./mkbefore')();
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1100,height:720}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'}); await p.waitForTimeout(1400);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  const q=await p.evaluate(()=>{
    state.polys=[];state.parts=[];state.d3sol=[];state.scaleM=1;state.specCode='AS-T1';
    const mk=(pts,lv,name,h,w,kz)=>({lv,name,kouzou:kz,pts:pts.map(v=>({x:v[0],y:v[1]})),
      edges:pts.map(()=>({h,w,k:'para'}))});
    const A=mk([[0,0],[13.1,0],[13.1,5],[15.3,5],[15.3,6.7],[8,6.7],[8,2.1],[0,2.1]],4.0,'屋根①',150,200,'w');
    const B=mk([[0,2.1],[0,10.9],[15.3,10.9],[15.3,6.7],[8,6.7],[8,2.1]],0,'屋根②',300,250,'rc');
    state.polys=[A,B]; state.active=0; sel=null;
    try{ nnSyncSharedEdges&&nnSyncSharedEdges(); }catch(_){}
    saveState(); recalc(); draw(); setTab('d3');
    return {a:+quantities(A,1).hira.toFixed(1), b:+quantities(B,1).hira.toFixed(1),
            kabe:B.edges.filter(e=>e.k==='kabe').length};
  });
  ok('前提：本人の図面と同じ形になっている（54.7㎡／101.1㎡）',
     q.a===54.7&&q.b===101.1, JSON.stringify(q));
  ok('前提：境界の3辺が自動で「壁当り」になっている', q.kabe===3, q.kabe+'辺');
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
  await p.waitForTimeout(2000);

  const r=await p.evaluate(()=>{
    /* 背の高い立体（＝壁らしきもの）を数える。屋根①の躯体1つだけのはず */
    const tall=[];
    T.group.traverse(o=>{ if(!o.isMesh||!o.geometry)return;
      if(o.material&&o.material.opacity===0)return;
      if(!o.visible)return;
      const bb=new THREE.Box3().setFromObject(o);
      if((bb.max.y-bb.min.y)>0.9 && bb.max.y>0.9)
        tall.push({name:o.name||o.geometry.type,
          body:(o.userData&&o.userData.bodyIdx!=null)?o.userData.bodyIdx:null,
          h:+(bb.max.y-bb.min.y).toFixed(2)});
    });
    /* 境界の壁の面の「見えている色」＝屋根①（W造＝木）のはず。
       二重壁があると、外壁（クリーム色）が木を覆い隠す。 */
    const rc=new THREE.Raycaster();
    /* 屋根②の側（z=8）から、境界の壁（x=4, z=2.1）を水平に見る */
    rc.set(new THREE.Vector3(4, 2.0, 8.0), new THREE.Vector3(0,0,-1).normalize());
    const hits=rc.intersectObjects(T.group.children,true)||[];
    let firstCol=null, firstName=null;
    for(const h of hits){ const o=h.object;
      if(!o.visible||!o.material||o.material.opacity===0) continue;
      if(o.userData&&(o.userData.pick||o.userData.face)) continue;
      if(h.point.y<0.5) continue;
      firstCol=o.material.color?('#'+o.material.color.getHexString()):''; firstName=o.name||o.geometry.type;
      break; }
    return {tall, n:tall.length, firstCol, firstName};
  });
  ok('①境の壁は1枚だけ（屋根①の躯体）＝勝手な外壁が立たない',
     r.n===1 && r.tall[0] && r.tall[0].body===0,
     r.n+'件 '+JSON.stringify(r.tall.slice(0,4)));
  ok('①屋根②の側から見える壁は「屋根①の躯体」（クリーム色の外壁で覆われていない）',
     r.firstName==='nnBody', r.firstName+' '+r.firstCol);

  /* ②辺を共有する相手がいないときは、今までどおり既定の外壁を立てる（壁当り本来の役目） */
  const alone=await p.evaluate(async()=>{
    state.polys=[];
    const P={lv:0,name:'屋根①',pts:[[0,0],[10,0],[10,8],[0,8]].map(v=>({x:v[0],y:v[1]})),
             edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))};
    P.edges[0].k='kabe';                 /* 相手のいない壁当り */
    state.polys=[P]; state.active=0; saveState(); build3D();
    await new Promise(r2=>setTimeout(r2,700));
    let hi=0; T.group.traverse(o=>{ if(!o.isMesh||!o.geometry||!o.visible)return;
      const bb=new THREE.Box3().setFromObject(o); hi=Math.max(hi,bb.max.y); });
    return +hi.toFixed(2);
  });
  ok('②相手がいない壁当りは、今までどおり既定の外壁（約2.9m）が立つ',
     alone>2.5 && alone<3.3, alone+'m');

  await p.evaluate(()=>{ state.polys=[]; state.active=-1; sel=null; saveState(); });
  ok('JSエラーなし', errs.length===0, errs.slice(0,2).join(' / '));
  console.log((BEFORE?'【直す前 _before.html】':'【いま】')+'\n'+R.join('\n'));
  console.log('★NG '+R.filter(x=>x[0]==='★').length+' / '+R.length+'件');
  await b.close();
})();
