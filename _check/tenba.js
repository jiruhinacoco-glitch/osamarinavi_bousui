/* 1辺だけ立上りを高くしたとき、天端の両端に「三角の空洞」ができていないか
   ＋ 天端がフラット（面取りなし＝田島ルーフィングの納まり）になっているか

   ★2026-08-29j に見つけた不具合（本人が赤い点線で指摘した「空洞」）：
     天端の面取りは「斜面の板1枚」で作っていて、**壁の端がふさがっていなかった**。
     高さのそろった角では隣の壁がふさぐので見えないが、1辺だけ高くすると
     隣が低くて塞がらず、**両端に三角の穴があいて**いた。
     いまは天端をフラット（面取りなし）にしたので、壁は「本体1つの閉じた立体」になり
     穴が生まれない。

   ★確かめ方：面取りのあった高さに、壁の中から外へ向けて光線を撃つ。
     ふさがっていれば必ず当たる。穴があれば素通りする。

   使い方: node _check/tenba.js
           node _check/tenba.js before   … 直す前のファイルと比べる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const {execSync}=require('child_process');
const BEFORE=process.argv[2]==='before';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
let FILE='zumen_sekisan.html';
if(BEFORE){ FILE='_before_tenba.html'; execSync('git show HEAD:zumen_sekisan.html > '+FILE); }
/* 6m×5m・辺0（(0,0)→(6,0)）だけ立上り1200mm、他は300mm。天端幅250mm */
const RING={pts:[{x:0,y:0},{x:6,y:0},{x:6,y:5},{x:0,y:5}],
  edges:[{h:1200,w:250,k:'para'},{h:300,w:250,k:'para'},{h:300,w:250,k:'para'},{h:300,w:250,k:'para'}],
  lv:0, holes:[], name:'屋根①'};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:800}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,70)));
  await p.goto('http://localhost:8899/'+FILE,{waitUntil:'load'});
  await p.evaluate(r=>localStorage.setItem('nn_zumen_v1',JSON.stringify(
    {polys:[r],parts:[],d3sol:[],scaleM:1,specCode:'AS-T1'})),RING);
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1900);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(3200);

  const r=await p.evaluate(()=>{
    T.group.updateMatrixWorld(true);
    const shoot=(from,dir)=>{
      const rc=new THREE.Raycaster(new THREE.Vector3(from[0],from[1],from[2]),
        new THREE.Vector3(dir[0],dir[1],dir[2]).normalize(), 0.001, 0.6);
      const hs=rc.intersectObjects(T.group.children,true)||[];
      return hs.filter(h=>h.object&&h.object.visible!==false).length;
    };
    /* 高さ1.19m（面取りがあった高さ）で、壁の中から両端の外へ撃つ */
    const out={};
    out.leftOuter  = shoot([0.05,1.19,0.010],[-1,0,0]);   /* 左端・外寄り（面取りの外側） */
    out.leftInner  = shoot([0.05,1.19,0.240],[-1,0,0]);   /* 左端・内寄り（面取りの内側） */
    out.rightOuter = shoot([5.95,1.19,0.010],[ 1,0,0]);   /* 右端・外寄り */
    out.rightInner = shoot([5.95,1.19,0.240],[ 1,0,0]);   /* 右端・内寄り */
    /* 天端がフラットか＝天端の高さ(1.20)のすぐ下に、斜めの面が無いこと */
    let slopeFaces=0;
    T.group.traverse(o=>{ if(!o.isMesh||!o.geometry||!o.geometry.attributes)return;
      if(o.geometry.attributes.position.count!==4)return;   /* slope() は4点の板 */
      o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox;
      const y0=bb.min.y+(o.position?o.position.y:0), y1=bb.max.y+(o.position?o.position.y:0);
      /* 面取りの斜面は「高さ20mmほどの短い板」。立上り防水層（背の高い板）と区別する */
      if(y1>1.17&&y0>1.13&&y1<1.22&&(y1-y0)>0.001&&(y1-y0)<0.05) slopeFaces++; });
    /* 天端の面（防水層）の幅＝外面から内面までフルにあるか */
    let memW=null;
    T.group.traverse(o=>{ if(memW!=null||!o.isMesh||!o.geometry||!o.geometry.attributes)return;
      const c=o.material&&o.material.color?o.material.color.getHexString():'';
      o.geometry.computeBoundingBox(); const bb=o.geometry.boundingBox;
      const y1=bb.max.y+(o.position?o.position.y:0);
      if(Math.abs(y1-1.212)<0.004 && bb.max.x-bb.min.x>5) memW=+(bb.max.z-bb.min.z).toFixed(3); });
    return Object.assign(out,{slopeFaces, memW});
  });

  ok('天端の左端・外寄りに穴がない', r.leftOuter>0, r);
  ok('天端の左端・内寄りに穴がない', r.leftInner>0, {n:r.leftInner});
  ok('天端の右端・外寄りに穴がない', r.rightOuter>0, {n:r.rightOuter});
  ok('天端の右端・内寄りに穴がない', r.rightInner>0, {n:r.rightInner});
  ok('天端はフラット（面取りの斜面が0枚）', r.slopeFaces===0, {n:r.slopeFaces});
  ok('天端の防水層が外面から内面まである（250mm）', r.memW!=null && Math.abs(r.memW-0.25)<0.02, {幅:r.memW});
  ok('JSエラーなし', errs.length===0, errs.slice(0,3));

  console.log(R.join('\n'));
  const ng=R.filter(x=>x.startsWith('★')).length;
  console.log(ng?('\n★NG '+ng+'件'):'\n全部○');
  if(BEFORE){ try{ execSync('rm -f _before_tenba.html'); }catch(_){} }
  await b.close(); process.exit(ng?1:0);
})();
