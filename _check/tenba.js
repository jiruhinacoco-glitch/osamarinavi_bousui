/* ★2026-08-29k 天端の面取りと「両端の三角の空洞」の検査
   ★2026-08-29p 面取りは**内側だけ**（本人の指摘「天端の外壁側まで面が取れている。
   本来は内側だけ面を取るはず」）。外側の斜面は無いこと・天端の防水層が
   外の面（z=0）までいっぱいに届くことも見る。
   ・内側の面取り（CH=20mm）が**在る**こと（本人の指示「内側の面取りは必須」）
   ・1辺だけ高くしたとき、その壁の両端の小口がふさがっていること
     ＝立体の中から端の面へ光線を飛ばして、必ず何かに当たるか（0件＝穴）
   ・高さのそろった角には余計なふさぎ板が無いこと（隣の壁が隠すので不要。
     置くと面が重なってちらつく）
   使い方：node _check/tenba.js            … いまのファイル
   　　　　node _check/tenba.js <file>    … 別のファイル（例 _before.html）と比較 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const file=process.argv[2]||'zumen_sekisan.html';
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:800}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/'+file,{waitUntil:'load'});
  await p.waitForTimeout(1400); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}} );
  /* 6m×4m・辺0（(0,0)→(6,0)）だけ立上り1200・他は300 */
  await p.evaluate(()=>{
    state.scaleM=1;
    const pts=[{x:0,y:0},{x:6,y:0},{x:6,y:4},{x:0,y:4}];
    state.polys=[{name:'屋根①', lv:0, pts, holes:[],
      edges:pts.map((_,i)=>({h:i===0?1200:300, w:250, k:'para'}))}];
    state.active=0; try{saveState();}catch(_){}
    setTab('d3');
  });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined' && T && T.group && T.group.children.length>3; }catch(_){ return false; } },{timeout:20000});
  await p.waitForTimeout(600);
  const r=await p.evaluate(()=>{
    const out={};
    T.group.updateMatrixWorld(true);
    const rc=new THREE.Raycaster();
    const objs=[]; T.group.traverse(o=>{ if(o.isMesh && o.visible && (!o.material||o.material.opacity===undefined||o.material.opacity>0.5)) objs.push(o); });
    const shoot=(orig,dir)=>{ rc.set(new THREE.Vector3(...orig), new THREE.Vector3(...dir).normalize());
      rc.far=0.6; return rc.intersectObjects(objs,false).length; };
    /* 辺0の壁：外面 z=0・内面 z=0.25。高い壁の上部（1.18〜1.20）の小口を、
       壁の中（x=0.05／5.95）から端へ向けて撃つ。当たらなければ穴。 */
    out.leftOuter  = shoot([0.05,1.19,0.0145],[-1,0,0]);   /* 外側（帯の小口。押し出しなので自動でふさがる） */
    out.leftInner  = shoot([0.05,1.19,0.2355],[-1,0,0]);   /* 内の三角（z 0.23〜0.24の帯・capEnd） */
    out.rightOuter = shoot([5.95,1.19,0.0145],[ 1,0,0]);
    out.rightInner = shoot([5.95,1.19,0.2355],[ 1,0,0]);
    /* 面取りの斜面（上下に傾いた小さな板）が在るか＝BufferGeometryで法線Yが中間の面 */
    let slopes=0, low=0;
    T.group.traverse(o=>{
      if(!o.isMesh||!o.geometry||!o.geometry.attributes||!o.geometry.attributes.position)return;
      const g=o.geometry; if(g.index)return;
      const pos=g.attributes.position; if(pos.count>12)return;   /* slope/capは6頂点 */
      const n=g.attributes.normal; if(!n)return;
      for(let i=0;i<n.count;i+=3){
        const ny=Math.abs(n.getY(i));
        if(ny>0.2&&ny<0.9){ slopes++; break; }
      }
    });
    out.slopes=slopes;
    /* ★2026-08-29p 外側の面取りが**無い**こと＝辺0（高い壁）の外寄り（z<0.1）に
       上下に傾いた小さな板が1枚も無い */
    let outerSlope=0;
    T.group.traverse(o=>{
      if(!o.isMesh||!o.geometry||!o.geometry.attributes||!o.geometry.attributes.position)return;
      const g=o.geometry; if(g.index)return;
      const pos=g.attributes.position; if(pos.count>12)return;
      const n=g.attributes.normal; if(!n)return;
      let tilted=false;
      for(let i=0;i<n.count;i+=3){ const ny=Math.abs(n.getY(i)); if(ny>0.2&&ny<0.9){tilted=true;break;} }
      if(!tilted)return;
      let zmaxV=-1e9, ymaxV=-1e9;
      for(let i=0;i<pos.count;i++){ zmaxV=Math.max(zmaxV,pos.getZ(i)); ymaxV=Math.max(ymaxV,pos.getY(i)); }
      if(zmaxV<0.1 && ymaxV>1.0) outerSlope++;   /* 高い辺0の外寄りにある斜めの板 */
    });
    out.outerSlope=outerSlope;
    /* 天端防水層の幅＝外の面〜th−CH（0〜0.23）＝0.23m（外側の面取りは廃止・2026-08-29p）。
       立上り1200の辺0の天端の上（y≈1.212）を、内外方向に走査して幅を測る */
    let zmin=1e9, zmax=-1e9;
    for(let z=0;z<=0.25;z+=0.005){
      const n1=shoot([3,1.5,z],[0,-1,0]);
      if(n1>0){
        rc.set(new THREE.Vector3(3,1.5,z), new THREE.Vector3(0,-1,0)); rc.far=0.6;
        const hits=rc.intersectObjects(objs,false);
        if(hits.length && Math.abs(hits[0].point.y-1.212)<0.004){ zmin=Math.min(zmin,z); zmax=Math.max(zmax,z); }
      }
    }
    out.memW=+(zmax-zmin).toFixed(3); out.memZmin=+zmin.toFixed(3);
    /* 高さのそろった角（辺1と辺2の角＝(6,4)）：capEnd が置かれていないこと。
       ＝小口の帯（外0.01〜0.02）へ、そろった高さ（0.29）で撃っても
       「端の三角の板」ではなく通しの壁に当たる。ここでは
       「6頂点のBufferGeometryのうち、辺1の端 x≈6 付近の縦の三角」が無いことを見る。 */
    let capAtEven=0;
    T.group.traverse(o=>{
      if(!o.isMesh||!o.geometry||!o.geometry.attributes)return;
      const g=o.geometry; if(g.index)return;
      const pos=g.attributes.position; if(!pos||pos.count!==6)return;
      /* 縦の板（法線が水平）で、高さが 0.28〜0.30 の帯にあるもの */
      let ymin=1e9,ymax=-1e9;
      for(let i=0;i<6;i++){ ymin=Math.min(ymin,pos.getY(i)); ymax=Math.max(ymax,pos.getY(i)); }
      const n=g.attributes.normal; if(!n)return;
      const ny=Math.abs(n.getY(0));
      if(ny<0.05 && ymax<=0.301 && ymin>=0.279) capAtEven++;
    });
    out.capAtEven=capAtEven;
    return out;
  });
  const NG=[];
  const ok=(c,name,info)=>{ console.log((c?'○':'★NG')+' '+name+(info!==undefined?('　'+info):'')); if(!c)NG.push(name); };
  ok(r.slopes>0, '内側の面取りの斜面がある（本人の指示：内側の面取りは必須）', r.slopes+'枚');
  ok(r.outerSlope===0, '外側の面取りが無い（面を取るのは内側だけ）', r.outerSlope+'枚');
  ok(r.leftOuter>0,  '高い壁の左端・外側の小口がふさがっている', r.leftOuter+'件');
  ok(r.leftInner>0,  '高い壁の左端・内の三角がふさがっている', r.leftInner+'件');
  ok(r.rightOuter>0, '高い壁の右端・外側の小口がふさがっている', r.rightOuter+'件');
  ok(r.rightInner>0, '高い壁の右端・内の三角がふさがっている', r.rightInner+'件');
  ok(Math.abs(r.memW-0.23)<0.03, '天端防水層は外の面〜内側の面取り（幅0.23m）', r.memW+'m');
  ok(r.memZmin<=0.006, '天端防水層が外の面までいっぱいに届く', 'zmin='+r.memZmin+'m');
  ok(r.capAtEven===0, '高さのそろった角に余計なふさぎ板が無い', r.capAtEven+'枚');
  ok(errs.length===0, 'JSエラーなし', errs.join('|')||'');
  console.log('===', file, ' ★NG', NG.length, NG.join(' / '));
  await b.close();
})();
